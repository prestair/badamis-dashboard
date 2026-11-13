import { NextResponse } from "next/server";
import { otpStore } from "../route";

// Track failed attempts per session (resets when new code is issued)
const failedAttempts = new Map<string, number>();
const MAX_ATTEMPTS = 5;

export async function POST(req: Request) {
  const body = await req.json() as { code?: string };
  const { code } = body;

  if (!code) {
    return NextResponse.json({ valid: false });
  }

  const stored = otpStore.get("master");
  if (stored !== undefined && stored === code) {
    // Correct — clear everything
    otpStore.delete("master");
    failedAttempts.delete("master");
    return NextResponse.json({ valid: true });
  }

  // Wrong code — increment attempts
  const attempts = (failedAttempts.get("master") ?? 0) + 1;
  failedAttempts.set("master", attempts);

  if (attempts >= MAX_ATTEMPTS) {
    // Reset counter and send new code automatically
    failedAttempts.delete("master");

    // Generate new code and send email (fire-and-forget)
    issueNewCode().catch((e) => console.error("[master-otp/verify] re-issue failed:", e));

    return NextResponse.json({ valid: false, newCodeSent: true });
  }

  return NextResponse.json({ valid: false, attemptsLeft: MAX_ATTEMPTS - attempts });
}

async function issueNewCode() {
  const { reissueOtp } = await import("../route");
  await reissueOtp();
}
