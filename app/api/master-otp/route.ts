import { NextResponse } from "next/server";
import { generateAndSendOtp } from "@/lib/masterOtp";

export async function POST() {
  try {
    await generateAndSendOtp();
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    console.error("[master-otp] failed to send OTP:", e);
    // Still return ok:true so the login flow isn't blocked if email fails
    return NextResponse.json({ ok: true });
  }
}
