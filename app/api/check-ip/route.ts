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
      // Generate OTP and send to admin
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      ipOtpStore.set(`${ip}:${username}`, { code, createdAt: new Date() });

      try {
        await sendOtpEmail(ip, username, code);
      } catch (emailErr) {
        console.error("[check-ip] OTP email failed:", emailErr);
      }

      try {
        await sendAlertEmail(ip, username);
      } catch (alertErr) {
        console.error("[check-ip] Alert email failed:", alertErr);
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

// ── Email helper ──────────────────────────────────────────────────────────────
async function sendOtpEmail(ip: string, username: string, code: string) {
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
    subject: `🔑 Login OTP for ${username} from unauthorised IP ${ip}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;">
        <h2 style="color:#1e3a5f;">🔑 Login OTP</h2>
        <p style="color:#374151;font-size:14px;">A login attempt was made from an unrecognised IP. Enter the OTP below to allow access.</p>
        <table style="border-collapse:collapse;font-size:14px;width:100%;margin-top:16px;">
          <tr style="background:#f8fafc;"><td style="padding:8px 12px;font-weight:bold;color:#374151;">IP Address</td><td style="padding:8px 12px;">${ip}</td></tr>
          <tr><td style="padding:8px 12px;font-weight:bold;color:#374151;">Username</td><td style="padding:8px 12px;">${username}</td></tr>
          <tr style="background:#f8fafc;"><td style="padding:8px 12px;font-weight:bold;color:#374151;">Time (IST)</td><td style="padding:8px 12px;">${now}</td></tr>
        </table>
        <div style="margin:24px 0;text-align:center;padding:20px;background:#eff6ff;border-radius:12px;border:2px solid #3b82f6;">
          <p style="margin:0 0 8px;font-size:13px;color:#1e40af;font-weight:bold;">OTP CODE</p>
          <p style="margin:0;font-size:42px;font-weight:900;color:#1e3a5f;letter-spacing:8px;font-family:monospace;">${code}</p>
        </div>
        <p style="color:#6b7280;font-size:12px;">This code expires in 10 minutes. Share it with the user only if this login attempt is legitimate.</p>
      </div>
    `,
  });
}
