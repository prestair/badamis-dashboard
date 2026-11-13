// Shared OTP store and reissue helper — imported by both
// app/api/master-otp/route.ts and app/api/master-otp/verify/route.ts

// Module-level OTP store — lives for the process lifetime
export const otpStore = new Map<string, string>();

async function sendOtpEmail(subject: string, code: string) {
  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_APP_PASSWORD;
  const adminTo   = process.env.GMAIL_ADMIN_TO;

  if (!gmailPass || !gmailUser || !adminTo) {
    console.warn("[master-otp] email not configured — skipping email");
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
    subject,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;">
        <h2 style="color:#1e3a5f;">🔑 ${subject}</h2>
        <table style="border-collapse:collapse;font-size:14px;width:100%;">
          <tr>
            <td style="padding:8px 12px;font-weight:bold;color:#374151;background:#f8fafc;border:1px solid #e2e8f0;">Code</td>
            <td style="padding:8px 12px;background:#f8fafc;border:1px solid #e2e8f0;">
              <span style="font-size:40px;font-weight:bold;font-family:monospace;letter-spacing:8px;color:#1e3a5f;">${code}</span>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 12px;font-weight:bold;color:#374151;border:1px solid #e2e8f0;">Time (IST)</td>
            <td style="padding:8px 12px;border:1px solid #e2e8f0;">${now}</td>
          </tr>
        </table>
        <p style="margin-top:16px;color:#6b7280;font-size:12px;">This code is valid for the current login session only.</p>
      </div>
    `,
  });
}

/** Generate a new 4-digit OTP, store it, and email it to admin. */
export async function generateAndSendOtp(): Promise<void> {
  const code = Math.floor(1000 + Math.random() * 9000).toString();
  otpStore.set("master", code);
  await sendOtpEmail("Master Login Code", code);
}

/** Called after 5 failed attempts — generates a fresh code and emails it. */
export async function reissueOtp(): Promise<void> {
  const code = Math.floor(1000 + Math.random() * 9000).toString();
  otpStore.set("master", code);
  await sendOtpEmail("New Master Login Code (5 failed attempts)", code);
}
