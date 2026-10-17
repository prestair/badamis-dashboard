import { NextResponse } from "next/server";

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "NOT_SET";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "NOT_SET";
  const gmailUser = process.env.GMAIL_USER ?? "NOT_SET";
  const gmailPass = process.env.GMAIL_APP_PASSWORD ? `SET (${process.env.GMAIL_APP_PASSWORD.length} chars)` : "NOT_SET";
  const gmailTo   = process.env.GMAIL_ADMIN_TO ?? "NOT_SET";

  // Test email send
  let emailTest = "not_tested";
  if (process.env.GMAIL_APP_PASSWORD && process.env.GMAIL_USER && process.env.GMAIL_ADMIN_TO) {
    try {
      const nodemailer = await import("nodemailer");
      const transporter = nodemailer.default.createTransport({
        service: "gmail",
        auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
      });
      await transporter.sendMail({
        from: `"Prestair Test" <${process.env.GMAIL_USER}>`,
        to: process.env.GMAIL_ADMIN_TO,
        subject: "Prestair Email Test from Vercel",
        text: "If you received this, email is working correctly from production.",
      });
      emailTest = "sent_ok";
    } catch (e) {
      emailTest = `error: ${e instanceof Error ? e.message : String(e)}`;
    }
  }

  return NextResponse.json({
    gmail_user:   gmailUser,
    gmail_pass:   gmailPass,
    gmail_to:     gmailTo,
    email_test:   emailTest,
    node_env:     process.env.NODE_ENV,
    supabase_url: url.substring(0, 30) + "...",
  });
}
