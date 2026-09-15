import { NextResponse } from "next/server";
import { getSupabaseAdminClient, getSupabaseClient } from "@/lib/supabase";

const TABLE = "hsn_codes";
const MAX_LEN = 40;

function isLoggedIn(req: Request) {
  const role = req.headers.get("x-user-role")?.trim().toLowerCase();
  return role === "admin" || role === "user";
}
function normalizeCode(v: unknown): string {
  return typeof v === "string" ? v.trim().replace(/\s+/g, " ") : "";
}
// Use admin client for all ops to avoid RLS/schema-cache issues (auth enforced in API)
function getClient() {
  return getSupabaseAdminClient() ?? getSupabaseClient();
}

export async function GET() {
  try {
    const sb = getClient();
    if (!sb) return NextResponse.json([]);
    const { data, error } = await sb
      .from(TABLE)
      .select("id, code, description, created_at")
      .order("code", { ascending: true });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data ?? []);
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error" }, { status: 500 });
  }
}

// Add — any logged-in user
export async function POST(req: Request) {
  if (!isLoggedIn(req)) return NextResponse.json({ error: "Login required." }, { status: 403 });
  try {
    const body = await req.json() as Record<string, unknown>;
    const code = normalizeCode(body.code);
    const description = normalizeCode(body.description);
    if (!code) return NextResponse.json({ error: "HSN code is required." }, { status: 400 });
    if (code.length > MAX_LEN) return NextResponse.json({ error: `Code too long (max ${MAX_LEN}).` }, { status: 400 });

    const sb = getClient();
    if (!sb) return NextResponse.json({ error: "Database not configured." }, { status: 503 });
    const { data, error } = await sb
      .from(TABLE)
      .insert({ code, description })
      .select("id, code, description, created_at")
      .single();
    if (error?.code === "23505") return NextResponse.json({ error: "This HSN code already exists." }, { status: 409 });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data, { status: 201 });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error" }, { status: 500 });
  }
}
