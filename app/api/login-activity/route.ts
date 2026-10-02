import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase";

function isAdminRequest(req: Request) {
  return req.headers.get("x-user-role")?.trim().toLowerCase() === "admin";
}

// ── GET — list all login activity records (admin only) ────────────────────────
export async function GET(req: Request) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  try {
    const admin = getSupabaseAdminClient();
    if (!admin) return NextResponse.json({ error: "Database not configured." }, { status: 503 });

    const { data, error } = await admin
      .from("login_activity")
      .select("id, username, logged_in_at, ip_address, device_info, latitude, longitude, gps_accuracy, gps_error, city")
      .order("logged_in_at", { ascending: false })
      .limit(200);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data ?? []);
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Server error" },
      { status: 500 },
    );
  }
}

// ── POST — record a login event (called client-side after successful auth) ────
export async function POST(req: Request) {
  try {
    const body = await req.json() as Record<string, unknown>;
    const username = String(body.username ?? "").trim();
    if (!username) {
      return NextResponse.json({ error: "username required." }, { status: 400 });
    }

    // Best-effort IP: Next.js forwards these headers from the edge/proxy.
    // x-forwarded-for may contain a comma-separated list; take the first entry.
    const forwarded = req.headers.get("x-forwarded-for");
    const ip = forwarded
      ? forwarded.split(",")[0].trim()
      : (req.headers.get("x-real-ip") ?? null);

    // Device info from User-Agent
    const userAgent = req.headers.get("user-agent") ?? null;
    // Truncate to 300 chars so it fits comfortably in the DB column
    const deviceInfo = userAgent ? userAgent.slice(0, 300) : null;

    const admin = getSupabaseAdminClient();
    if (!admin) {
      // If DB is not configured, silently succeed so login is not blocked
      return NextResponse.json({ ok: true, stored: false });
    }

    // Resolve user_id from username (best-effort — null if not found)
    const { data: userRow } = await admin
      .from("app_users")
      .select("id")
      .ilike("username", username)
      .single();

    const record = {
      user_id:     userRow?.id ?? null,
      username,
      ip_address:  ip,
      device_info: deviceInfo,
      latitude:    typeof body.latitude === "number" ? body.latitude : null,
      longitude:   typeof body.longitude === "number" ? body.longitude : null,
      gps_accuracy: typeof body.gpsAccuracy === "number" ? body.gpsAccuracy : null,
      gps_error:   typeof body.gpsError === "string" ? body.gpsError : null,
      city:        typeof body.city === "string" ? body.city : null,
    };

    const { error } = await admin.from("login_activity").insert([record]);
    if (error) {
      console.error("[login-activity] insert error:", error.message);
      return NextResponse.json({ ok: true, stored: false });
    }

    // Keep only the latest 200 records to stay within Supabase free plan limits.
    // Delete oldest rows when count exceeds 200.
    const { count } = await admin
      .from("login_activity")
      .select("id", { count: "exact", head: true });

    if (count && count > 200) {
      // Find the cutoff timestamp: the 200th newest record
      const { data: cutoffRow } = await admin
        .from("login_activity")
        .select("logged_in_at")
        .order("logged_in_at", { ascending: false })
        .range(199, 199)
        .single();

      if (cutoffRow?.logged_in_at) {
        await admin
          .from("login_activity")
          .delete()
          .lt("logged_in_at", cutoffRow.logged_in_at);
      }
    }

    return NextResponse.json({ ok: true, stored: true }, { status: 201 });
  } catch (e: unknown) {
    // Never block a login due to activity tracking failure
    console.error("[login-activity] unexpected error:", e);
    return NextResponse.json({ ok: true, stored: false });
  }
}

// ── DELETE — remove a single activity record (admin only) ─────────────────────
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

    const { error } = await admin.from("login_activity").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Server error" },
      { status: 500 },
    );
  }
}
