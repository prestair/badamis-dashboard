import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase";

function isAdminRequest(req: Request) {
  return req.headers.get("x-user-role")?.trim().toLowerCase() === "admin";
}

// ── GET — list all authorised IPs (admin only) ────────────────────────────────
export async function GET(req: Request) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }
  try {
    const admin = getSupabaseAdminClient();
    if (!admin) return NextResponse.json({ error: "Database not configured." }, { status: 503 });
    const { data, error } = await admin
      .from("authorised_ips")
      .select("id, ip_address, label, created_at")
      .order("created_at", { ascending: false });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data ?? []);
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Server error" }, { status: 500 });
  }
}

// ── POST — add an authorised IP (admin only) ──────────────────────────────────
export async function POST(req: Request) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }
  try {
    const body = await req.json() as Record<string, unknown>;
    const ipAddress = String(body.ipAddress ?? "").trim();
    const label = String(body.label ?? "").trim() || null;
    if (!ipAddress) return NextResponse.json({ error: "IP address required." }, { status: 400 });

    const admin = getSupabaseAdminClient();
    if (!admin) return NextResponse.json({ error: "Database not configured." }, { status: 503 });

    const { data, error } = await admin
      .from("authorised_ips")
      .insert([{ ip_address: ipAddress, label }])
      .select("id, ip_address, label, created_at")
      .single();

    if (error?.code === "23505") {
      return NextResponse.json({ error: "This IP address is already authorised." }, { status: 409 });
    }
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data, { status: 201 });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Server error" }, { status: 500 });
  }
}

// ── DELETE — remove an authorised IP (admin only) ─────────────────────────────
export async function DELETE(req: Request) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id") ?? "";
    if (!id) return NextResponse.json({ error: "id required." }, { status: 400 });

    const admin = getSupabaseAdminClient();
    if (!admin) return NextResponse.json({ error: "Database not configured." }, { status: 503 });

    const { error } = await admin.from("authorised_ips").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Server error" }, { status: 500 });
  }
}
