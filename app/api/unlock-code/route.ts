import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase";

// DDL for the unlock_codes table:
// CREATE TABLE IF NOT EXISTS unlock_codes (
//   id bigserial PRIMARY KEY,
//   ip text NOT NULL,
//   username text NOT NULL,
//   code text NOT NULL,
//   used boolean DEFAULT false,
//   created_at timestamptz DEFAULT now()
// );

// In-memory fallback when Supabase is unavailable
const codeStore = new Map<string, { code: string; createdAt: Date; used: boolean }>();

// ── POST /api/unlock-code ─────────────────────────────────────────────────────
// Body: { ip: string, username: string }
// Generates a 6-digit code, stores it, and emails it to admin.
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const ip: string = body.ip ?? "";
    const username: string = body.username ?? "";

    if (!ip || !username) {
      return NextResponse.json({ ok: false, error: "ip and username are required" }, { status: 400 });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Try Supabase first
    let storedInDb = false;
    try {
      const admin = getSupabaseAdminClient();
      if (admin) {
        const { error } = await admin
          .from("unlock_codes")
          .insert({ ip, username, code, used: false });
        if (!error) storedInDb = true;
        else console.error("[unlock-code] Supabase insert error:", error.message);
      }
    } catch (dbErr) {
      console.error("[unlock-code] DB error:", dbErr);
    }

    // Fall back to in-memory store if Supabase unavailable
    if (!storedInDb) {
      codeStore.set(`${ip}:${username}`, { code, createdAt: new Date(), used: false });
    }

    // Send email to admin
    try {
      await sendUnlockEmail(ip, username, code);
    } catch (emailErr) {
      console.error("[unlock-code] email error:", emailErr);
      // Don't fail the request if email fails — code is still stored
    }

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    console.error("[unlock-code] POST error:", e);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}

// ── GET /api/unlock-code?ip=...&username=...&code=... ─────────────────────────
// Verifies code. Returns { valid: true } on match within 15 min, else { valid: false }.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const ip = searchParams.get("ip") ?? "";
  const username = searchParams.get("username") ?? "";
  const code = searchParams.get("code") ?? "";

  if (!ip || !username || !code) {
    return NextResponse.json({ valid: false });
  }

  const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);

  // Try Supabase first
  try {
    const admin = getSupabaseAdminClient();
    if (admin) {
      const { data: rows, error } = await admin
        .from("unlock_codes")
        .select("id, code, created_at, used")
        .eq("ip", ip)
        .eq("username", username)
        .eq("used", false)
        .order("created_at", { ascending: false })
        .limit(1);

      if (!error && rows && rows.length > 0) {
        const row = rows[0];
        const createdAt = new Date(row.created_at);
        if (row.code === code && createdAt > fifteenMinutesAgo) {
          // Mark as used
          await admin.from("unlock_codes").update({ used: true }).eq("id", row.id);
          return NextResponse.json({ valid: true });
        }
        return NextResponse.json({ valid: false });
      }
      if (error) console.error("[unlock-code] Supabase select error:", error.message);
    }
  } catch (dbErr) {
    console.error("[unlock-code] DB verify error:", dbErr);
  }

  // Fallback: check in-memory store
  const entry = codeStore.get(`${ip}:${username}`);
  if (entry && !entry.used && entry.code === code && entry.createdAt > fifteenMinutesAgo) {
    entry.used = true;
    return NextResponse.json({ valid: true });
  }

  return NextResponse.json({ valid: false });
}

// ── Email helper ──────────────────────────────────────────────────────────────
async function sendUnlockEmail(ip: string, username: string, code: string) {
  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_APP_PASSWORD;
  const adminTo   = process.env.GMAIL_ADMIN_TO;

  if (!gmailPass || !gmailUser || !adminTo) {
    console.warn("[unlock-code] email not configured — skipping");
    return;
  }

  const nodemailer = await import("nodemailer");
  const transporter = nodemailer.default.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user: gmailUser, pass: gmailPass },
  });

  const now = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });

  await transporter.sendMail({
    from: `"Prestair Security" <${gmailUser}>`,
    to: adminTo,
    subject: `🔒 Login Unlock Code for ${username} from ${ip}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;">
        <h2 style="color:#d97706;">🔒 Login Unlock Code</h2>
        <p style="color:#374151;font-size:14px;">A login attempt was made from an unauthorised IP. The login form has been locked. Share the code below with the user if this attempt is legitimate.</p>
        <table style="border-collapse:collapse;font-size:14px;width:100%;margin-top:16px;">
          <tr style="background:#fef3c7;"><td style="padding:8px 12px;font-weight:bold;color:#92400e;">IP Address</td><td style="padding:8px 12px;color:#1f2937;">${ip}</td></tr>
          <tr><td style="padding:8px 12px;font-weight:bold;color:#92400e;">Username</td><td style="padding:8px 12px;color:#1f2937;">${username}</td></tr>
          <tr style="background:#fef3c7;"><td style="padding:8px 12px;font-weight:bold;color:#92400e;">Time (IST)</td><td style="padding:8px 12px;color:#1f2937;">${now}</td></tr>
        </table>
        <div style="margin:24px 0;text-align:center;padding:20px;background:#fef3c7;border-radius:12px;border:2px solid #f59e0b;">
          <p style="margin:0 0 8px;font-size:13px;color:#92400e;font-weight:bold;">UNLOCK CODE</p>
          <p style="margin:0;font-size:42px;font-weight:900;color:#b45309;letter-spacing:8px;font-family:monospace;">${code}</p>
        </div>
        <p style="color:#6b7280;font-size:12px;">Enter this code in the login form to re-enable login. This code expires in 15 minutes.</p>
      </div>
    `,
  });
}
