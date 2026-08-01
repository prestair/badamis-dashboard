import { NextResponse } from "next/server";
import { getSupabaseClient, getSupabaseAdminClient } from "@/lib/supabase";

function isAdminRequest(req: Request) {
  return req.headers.get("x-user-role")?.trim().toLowerCase() === "admin";
}

// ── GET all users (public — needed for login) ─────────────────────────────────
export async function GET() {
  try {
    const sb = getSupabaseClient();
    if (sb) {
      const { data, error } = await sb
        .from("app_users")
        .select("id, username, password, role, full_name, active")
        .order("created_at", { ascending: true });
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json(data ?? []);
    }

    // Fallback: return from localStorage seed via client (no server users table)
    return NextResponse.json([]);
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Server error" },
      { status: 500 }
    );
  }
}

// ── POST create user (admin only) ─────────────────────────────────────────────
export async function POST(req: Request) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  try {
    const body = await req.json();
    const username = String(body.username ?? "").trim();
    const password = String(body.password ?? "");
    const role = body.role === "admin" ? "admin" : "user";
    const fullName = String(body.fullName ?? "").trim();

    if (!username) return NextResponse.json({ error: "Username required." }, { status: 400 });
    if (password.length < 6) return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400 });

    const admin = getSupabaseAdminClient();
    if (!admin) return NextResponse.json({ error: "Database not configured." }, { status: 503 });

    const { data, error } = await admin
      .from("app_users")
      .insert([{ username, password, role, full_name: fullName, active: true }])
      .select()
      .single();

    if (error) {
      if (error.code === "23505") return NextResponse.json({ error: "Username already exists." }, { status: 409 });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data, { status: 201 });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Server error" },
      { status: 500 }
    );
  }
}

// ── PUT update user (admin only) ──────────────────────────────────────────────
export async function PUT(req: Request) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  try {
    const body = await req.json();
    const id = String(body.id ?? "");
    if (!id) return NextResponse.json({ error: "User id required." }, { status: 400 });

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (body.password !== undefined && body.password !== "") updates.password = body.password;
    if (body.role !== undefined) updates.role = body.role === "admin" ? "admin" : "user";
    if (body.fullName !== undefined) updates.full_name = String(body.fullName).trim();
    if (body.active !== undefined) updates.active = Boolean(body.active);

    const admin = getSupabaseAdminClient();
    if (!admin) return NextResponse.json({ error: "Database not configured." }, { status: 503 });

    const { data, error } = await admin
      .from("app_users")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ error: "User not found." }, { status: 404 });
    return NextResponse.json(data);
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Server error" },
      { status: 500 }
    );
  }
}

// ── DELETE user (admin only) ──────────────────────────────────────────────────
export async function DELETE(req: Request) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id") ?? "";
    if (!id) return NextResponse.json({ error: "User id required." }, { status: 400 });

    const admin = getSupabaseAdminClient();
    if (!admin) return NextResponse.json({ error: "Database not configured." }, { status: 503 });

    // Prevent deleting admin account
    const { data: user } = await admin.from("app_users").select("username").eq("id", id).single();
    if (user?.username === "admin") {
      return NextResponse.json({ error: "Cannot delete admin account." }, { status: 403 });
    }

    const { error } = await admin.from("app_users").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Server error" },
      { status: 500 }
    );
  }
}
