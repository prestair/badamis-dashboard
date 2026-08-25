import { NextResponse } from "next/server";
import { getSupabaseAdminClient, getSupabaseClient } from "@/lib/supabase";

const TABLE = "requesters";

function isAdmin(req: Request) {
  return req.headers.get("x-user-role")?.trim().toLowerCase() === "admin";
}

function normalizeName(v: unknown): string {
  return typeof v === "string" ? v.trim().replace(/\s+/g, " ") : "";
}

export async function GET() {
  try {
    const supabase = getSupabaseClient();
    if (supabase) {
      const { data, error } = await supabase
        .from(TABLE)
        .select("id, name, created_at")
        .order("name", { ascending: true });
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json(data ?? []);
    }
    return NextResponse.json([]);
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  if (!isAdmin(req)) return NextResponse.json({ error: "Admin access required." }, { status: 403 });

  try {
    const body = await req.json() as Record<string, unknown>;
    const name = normalizeName(body.name);
    if (!name) return NextResponse.json({ error: "Name is required." }, { status: 400 });
    if (name.length > 200) return NextResponse.json({ error: "Name too long (max 200)." }, { status: 400 });

    const supabase = getSupabaseClient();
    if (supabase) {
      const admin = getSupabaseAdminClient();
      if (!admin) return NextResponse.json({ error: "Server not configured." }, { status: 503 });
      const { data, error } = await admin
        .from(TABLE)
        .insert({ name })
        .select("id, name, created_at")
        .single();
      if (error?.code === "23505") return NextResponse.json({ error: "This name already exists." }, { status: 409 });
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json(data, { status: 201 });
    }
    return NextResponse.json({ error: "Database not configured." }, { status: 503 });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error" }, { status: 500 });
  }
}
