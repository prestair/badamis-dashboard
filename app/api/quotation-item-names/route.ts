import { NextResponse } from "next/server";
import { getSupabaseAdminClient, getSupabaseClient } from "@/lib/supabase";
import { createItemName, readItemNames } from "@/lib/itemNameStore";

const MAX_ITEM_NAME_LENGTH = 500;

function isAdminRequest(request: Request) {
  return request.headers.get("x-user-role")?.trim().toLowerCase() === "admin";
}

function normalizeItemName(value: unknown): string {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}

function validationError(itemName: string): string | null {
  if (!itemName) return "Item Name is required.";
  if (itemName.length > MAX_ITEM_NAME_LENGTH) {
    return `Item Name must be ${MAX_ITEM_NAME_LENGTH} characters or fewer.`;
  }
  return null;
}

export async function GET() {
  try {
    const supabase = getSupabaseClient();
    if (supabase) {
      const { data, error } = await supabase
        .from("quotation_item_names")
        .select("id, item_name, created_at, updated_at")
        .order("item_name", { ascending: true });
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json(data ?? []);
    }

    return NextResponse.json(readItemNames());
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load Item Names." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  try {
    const body = await request.json() as Record<string, unknown>;
    const itemName = normalizeItemName(body.itemName);
    const invalid = validationError(itemName);
    if (invalid) return NextResponse.json({ error: invalid }, { status: 400 });

    const publicSupabase = getSupabaseClient();
    if (publicSupabase) {
      const adminSupabase = getSupabaseAdminClient();
      if (!adminSupabase) {
        return NextResponse.json(
          { error: "Server Item Name administration is not configured." },
          { status: 503 }
        );
      }
      const { data, error } = await adminSupabase
        .from("quotation_item_names")
        .insert({ item_name: itemName })
        .select("id, item_name, created_at, updated_at")
        .single();
      if (error?.code === "23505") {
        return NextResponse.json({ error: "This Item Name already exists." }, { status: 409 });
      }
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json(data, { status: 201 });
    }

    const created = createItemName(itemName);
    if (!created) {
      return NextResponse.json({ error: "This Item Name already exists." }, { status: 409 });
    }
    return NextResponse.json(created, { status: 201 });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to add Item Name." },
      { status: 500 }
    );
  }
}
