import { NextResponse } from "next/server";
import { getSupabaseAdminClient, getSupabaseClient } from "@/lib/supabase";

const TABLE = "hsn_codes";
const MAX_LEN = 40;

function isAdmin(req: Request) {
  return req.headers.get("x-user-role")?.trim().toLowerCase() === "admin";
}
function isLoggedIn(req: Request) {
  const role = req.headers.get("x-user-role")?.trim().toLowerCase();
  return role === "admin" || role === "user";
}
function normalizeCode(v: unknown): string {
  return typeof v === "string" ? v.trim().replace(/\s+/g, " ") : "";
}
function getClient() {
  return getSupabaseAdminClient() ?? getSupabaseClient();
}

// Edit — any logged-in user
export async function PUT(req: Request, context: { params: Promise<{ id: string }> }) {
  if (!isLoggedIn(req)) return NextResponse.json({ error: "Login required." }, { status: 403 });
  try {
    const { id } = await context.params;
    const body = await req.json() as Record<string, unknown>;
    const code = normalizeCode(body.code);
    const description = normalizeCode(body.description);
    if (!code) return NextResponse.json({ error: "HSN code is required." }, { status: 400 });
    if (code.length > MAX_LEN) return NextResponse.json({ error: `Code too long (max ${MAX_LEN}).` }, { status: 400 });

    const sb = getClient();
    if (!sb) return NextResponse.json({ error: "Database not configured." }, { status: 503 });
    const { data, error } = await sb
      .from(TABLE)
      .update({ code, description })
      .eq("id", id)
      .select("id, code, description, created_at")
      .single();
    if (error?.code === "23505") return NextResponse.json({ error: "This HSN code already exists." }, { status: 409 });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error" }, { status: 500 });
  }
}

// Delete — admin only
export async function DELETE(req: Request, context: { params: Promise<{ id: string }> }) {
  if (!isAdmin(req)) return NextResponse.json({ error: "Admin access required to delete." }, { status: 403 });
  try {
    const { id } = await context.params;
    const sb = getClient();
    if (!sb) return NextResponse.json({ error: "Database not configured." }, { status: 503 });
    const { error } = await sb.from(TABLE).delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error" }, { status: 500 });
  }
}
