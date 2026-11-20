import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase";

// In-memory OTP store: key = `${ip}:${username}`, value = { code, createdAt }
const ipOtpStore = new Map<string, { code: string; createdAt: Date }>();

// ── GET /api/check-ip?username=<name> ────────────────────────────────────────
// Returns { allowed: boolean, ip: string }
// If allowed === false, an OTP is sent to the admin email automatically.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const username = searchParams.get("username") ?? "unknown";

  const forwarded = req.headers.get("x-forwarded-for");
  const ip = forwarded
    ? forwarded.split(",")[0].trim()
    : (req.headers.get("x-real-ip") ?? "unknown");

  try {
    const admin = getSupabaseAdminClient();
    if (!admin) return NextResponse.json({ allowed: true, ip });

    const { data: rows, error } = await admin
      .from("authorised_ips")
      .select("ip_address");

    if (error) {
      console.error("[check-ip] DB error:", error.message);
      return NextResponse.json({ allowed: true, ip });
    }

    if (!rows || rows.length === 0) {
      return NextResponse.json({ allowed: true, ip });
    }

    const isLocal =
      ip === "unknown" ||
      ip === "::1" ||
      ip === "127.0.0.1" ||
      ip.startsWith("192.168.") ||
      ip.startsWith("10.");
    if (isLocal) {
      return NextResponse.json({ allowed: true, ip });
    }

    const authorised = rows.map((r: { ip_address: string }) => r.ip_address.trim());
    const allowed = authorised.includes(ip);

    if (!allowed) {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      ipOtpStore.set(`${ip}:${username}`, { code, createdAt: new Date() });

      try {
        await sendAlertEmail(ip, username);
      } catch (alertErr) {
        console.error("[check-ip] alert email failed:", alertErr);
      }

      try {
        await sendOtpEmail(ip, username, code);
      } catch (emailErr) {
        console.error("[check-ip] OTP email failed:", emailErr);
      }
    }

    return NextResponse.json({ allowed, ip });
  } catch (e: unknown) {
    console.error("[check-ip] unexpected error:", e);
    return NextResponse.json({ allowed: true, ip });
  }
}

// ── POST /api/check-ip ────────────────────────────────────────────────────────
// Body: { ip, username, code }
// Returns { valid: boolean }
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const ip: string = body.ip ?? "";
    const username: string = body.username ?? "";
    const code: string = body.code ?? "";

    if (!ip || !username || !code) {
      return NextResponse.json({ valid: false });
    }

    const entry = ipOtpStore.get(`${ip}:${username}`);
    if (!entry) return NextResponse.json({ valid: false });

    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    if (entry.code === code && entry.createdAt > tenMinutesAgo) {
      ipOtpStore.delete(`${ip}:${username}`);
      return NextResponse.json({ valid: true });
    }

    return NextResponse.json({ valid: false });
  } catch (e) {
    console.error("[check-ip] POST error:", e);
    return NextResponse.json({ valid: false });
  }
}

// ── Email helper — sends warning + OTP in one email ──────────────────────────
async function sendEmail(ip: string, username: string, code: string) {
  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_APP_PASSWORD;
  const adminTo   = "agm.prestairsystem@gmail.com";

  if (!gmailPass || !gmailUser) {
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
    subject: `⚠️ Unauthorised Login Attempt — OTP for ${username}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;">

        <div style="background:#fef2f2;border-left:4px solid #dc2626;padding:16px 20px;border-radius:8px;margin-bottom:20px;">
          <h2 style="margin:0 0 6px;color:#dc2626;font-size:18px;">⚠️ Unauthorised Login Attempt Detected</h2>
          <p style="margin:0;color:#374151;font-size:14px;">A login attempt was made from an IP address that is not on the authorised list.</p>
        </div>

        <table style="border-collapse:collapse;font-size:14px;width:100%;margin-bottom:20px;">
          <tr style="background:#f8fafc;">
            <td style="padding:10px 14px;font-weight:bold;color:#374151;border:1px solid #e2e8f0;width:40%;">IP Address</td>
            <td style="padding:10px 14px;border:1px solid #e2e8f0;">${ip}</td>
          </tr>
          <tr>
            <td style="padding:10px 14px;font-weight:bold;color:#374151;border:1px solid #e2e8f0;">Username</td>
            <td style="padding:10px 14px;border:1px solid #e2e8f0;">${username}</td>
          </tr>
          <tr style="background:#f8fafc;">
            <td style="padding:10px 14px;font-weight:bold;color:#374151;border:1px solid #e2e8f0;">Time (IST)</td>
            <td style="padding:10px 14px;border:1px solid #e2e8f0;">${now}</td>
          </tr>
        </table>

        <div style="text-align:center;padding:24px 20px;background:#eff6ff;border-radius:12px;border:2px solid #3b82f6;margin-bottom:16px;">
          <p style="margin:0 0 8px;font-size:13px;color:#1e40af;font-weight:bold;text-transform:uppercase;letter-spacing:1px;">One-Time Password (OTP)</p>
          <p style="margin:0;font-size:48px;font-weight:900;color:#1e3a5f;letter-spacing:10px;font-family:monospace;">${code}</p>
          <p style="margin:8px 0 0;font-size:12px;color:#6b7280;">Valid for 10 minutes</p>
        </div>

        <p style="color:#6b7280;font-size:12px;line-height:1.6;">
          Share this OTP with the user only if this login attempt is legitimate. If you do not recognise this attempt, please review your authorised IP list immediately.
        </p>

      </div>
    `,
  });
}
