import { NextResponse } from "next/server";

// Quick sanity check — never exposes actual values, only whether they are set.
export async function GET() {
  return NextResponse.json({
    status: "ok",
    env: {
      hasGmailUser:     !!process.env.GMAIL_USER,
      hasGmailPass:     !!process.env.GMAIL_APP_PASSWORD,
      hasAdminTo:       !!process.env.GMAIL_ADMIN_TO,
      hasSupabaseUrl:   !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasServiceRole:   !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    },
  });
}
