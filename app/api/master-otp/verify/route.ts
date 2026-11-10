import { NextResponse } from "next/server";
import { otpStore } from "../route";

export async function POST(req: Request) {
  const body = await req.json() as { code?: string };
  const { code } = body;

  if (!code) {
    return NextResponse.json({ valid: false });
  }

  const stored = otpStore.get("master");
  if (stored !== undefined && stored === code) {
    otpStore.delete("master");
    return NextResponse.json({ valid: true });
  }

  return NextResponse.json({ valid: false });
}
