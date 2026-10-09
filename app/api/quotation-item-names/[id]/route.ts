import { NextResponse } from "next/server";
import { getSupabaseAdminClient, getSupabaseClient } from "@/lib/supabase";
import { updateItemName } from "@/lib/itemNameStore";

const MAX_ITEM_NAME_LENGTH = 500;

function isAdminRequest(request: Request) {
  return request.headers.get("x-user-role")?.trim().toLowerCase() === "admin";
}

function normalizeItemName(value: unknown): string {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  try {
    const { id } = await params;
    const body = await request.json() as Record<string, unknown>;
    const itemName = normalizeItemName(body.itemName);
    if (!itemName) {
      return NextResponse.json({ error: "Item Name is required." }, { status: 400 });
    }
    if (itemName.length > MAX_ITEM_NAME_LENGTH) {
      return NextResponse.json(
        { error: `Item Name must be ${MAX_ITEM_NAME_LENGTH} characters or fewer.` },
        { status: 400 }
      );
    }

    // Per-foot rate. Explicit empty string "" → clear to null (blank).
    // A valid number → set it. Field absent → leave unchanged.
    const rateProvided = body.rate !== undefined;
    const rawRate = Number(body.rate);
    const rateValue: number | null =
      body.rate === "" || body.rate === null
        ? null
        : (Number.isFinite(rawRate) && rawRate >= 0 ? rawRate : null);

    // Standard rate — same handling.
    const stdProvided = body.standardRate !== undefined;
    const rawStd = Number(body.standardRate);
    const stdValue: number | null =
      body.standardRate === "" || body.standardRate === null
        ? null
        : (Number.isFinite(rawStd) && rawStd >= 0 ? rawStd : null);

    const publicSupabase = getSupabaseClient();
    if (publicSupabase) {
      const adminSupabase = getSupabaseAdminClient();
      if (!adminSupabase) {
        return NextResponse.json(
          { error: "Server Item Name administration is not configured." },
          { status: 503 }
        );
      }
      const updatePayload: Record<string, unknown> = {
        item_name: itemName,
        updated_at: new Date().toISOString(),
      };
      if (rateProvided) updatePayload.rate = rateValue;
      if (stdProvided) updatePayload.standard_rate = stdValue;

      const { data, error } = await adminSupabase
        .from("quotation_item_names")
        .update(updatePayload)
        .eq("id", id)
        .select("id, item_name, rate, standard_rate, created_at, updated_at")
        .single();
      if (error?.code === "23505") {
        return NextResponse.json({ error: "This Item Name already exists." }, { status: 409 });
      }
      if (error?.code === "PGRST116") {
        return NextResponse.json({ error: "Item Name not found." }, { status: 404 });
      }
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json(data);
    }

    const updated = updateItemName(id, itemName, rateProvided ? (rateValue ?? undefined) : undefined, stdProvided ? (stdValue ?? undefined) : undefined);
    if (!updated) {
      return NextResponse.json(
        { error: "Item Name was not found or the new value already exists." },
        { status: 409 }
      );
    }
    return NextResponse.json(updated);
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to update Item Name." },
      { status: 500 }
    );
  }
}
