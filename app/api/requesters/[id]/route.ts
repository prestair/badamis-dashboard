import { NextResponse } from "next/server";
import { getSupabaseAdminClient, getSupabaseClient } from "@/lib/supabase";

const TABLE = "requesters";

function isAdmin(req: Request) {
  return req.headers.get("x-user-role")?.trim().toLowerCase() === "admin";
}

export async function DELETE(req: Request, context: { params: Promise<{ id: string }> }) {
  if (!isAdmin(req)) return NextResponse.json({ error: "Admin access required." }, { status: 403 });

  try {
    const { id } = await context.params;
    const supabase = getSupabaseClient();
    if (supabase) {
      const admin = getSupabaseAdminClient();
      if (!admin) return NextResponse.json({ error: "Server not configured." }, { status: 503 });
      const { error } = await admin.from(TABLE).delete().eq("id", id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: "Database not configured." }, { status: 503 });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error" }, { status: 500 });
  }
}
