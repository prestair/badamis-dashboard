import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase";

// ── GET /api/check-ip?username=<name> ────────────────────────────────────────
// Public endpoint — no auth needed. Returns { allowed: boolean, ip: string }.
// If the authorised_ips table is EMPTY → allowed = true (no restriction).
// If table has rows → only IPs in the table are allowed.
// On DB failure → allowed = true (fail open so users aren't locked out by infra issues).
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const username = searchParams.get("username") ?? "unknown";

  // Best-effort IP detection from proxy headers.
  const forwarded = req.headers.get("x-forwarded-for");
  const ip = forwarded
    ? forwarded.split(",")[0].trim()
    : (req.headers.get("x-real-ip") ?? "unknown");

  try {
    const admin = getSupabaseAdminClient();
    if (!admin) return NextResponse.json({ allowed: true, ip });

    // Fetch all authorised IPs.
    const { data: rows, error } = await admin
      .from("authorised_ips")
      .select("ip_address");

    if (error) {
      // DB error → fail open.
      console.error("[check-ip] DB error:", error.message);
      return NextResponse.json({ allowed: true, ip });
    }

    // Empty table → no restriction.
    if (!rows || rows.length === 0) {
      return NextResponse.json({ allowed: true, ip });
    }

    // Local/loopback IPs (dev environment) → always allow.
    const isLocal = ip === "unknown" || ip === "::1" || ip === "127.0.0.1" || ip.startsWith("192.168.") || ip.startsWith("10.");
    if (isLocal) {
      return NextResponse.json({ allowed: true, ip });
    }

    const authorised = rows.map((r: { ip_address: string }) => r.ip_address.trim());
    const allowed = authorised.includes(ip);

    if (!allowed) {
      // Await email so errors surface in Vercel logs
      try {
        await sendAlertEmail(ip, username);
      } catch (emailErr) {
        console.error("[check-ip] email failed:", emailErr);
      }
    }

    return NextResponse.json({ allowed, ip });
  } catch (e: unknown) {
    console.error("[check-ip] unexpected error:", e);
    return NextResponse.json({ allowed: true, ip });
  }
}

// ── Email helper ──────────────────────────────────────────────────────────────
async function sendAlertEmail(ip: string, username: string) {
  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_APP_PASSWORD;
  const adminTo   = process.env.GMAIL_ADMIN_TO;

  if (!gmailPass || !gmailUser || !adminTo) {
    console.warn("[check-ip] email not configured — skipping");
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
    subject: `Unauthorised login attempt from ${ip} by ${username}`,
    html: `
      <h2 style="color:#dc2626;">⚠️ Unauthorised Login Attempt</h2>
      <table style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:14px;">
        <tr><td style="padding:6px 12px;font-weight:bold;color:#374151;">IP Address</td><td style="padding:6px 12px;">${ip}</td></tr>
        <tr><td style="padding:6px 12px;font-weight:bold;color:#374151;">Username</td><td style="padding:6px 12px;">${username}</td></tr>
        <tr><td style="padding:6px 12px;font-weight:bold;color:#374151;">Time (IST)</td><td style="padding:6px 12px;">${now}</td></tr>
      </table>
      <p style="margin-top:16px;color:#6b7280;font-size:12px;">
        This IP is not in the Authorised IPs list. Please review and add it if this is a legitimate user.
      </p>
    `,
  });
}
