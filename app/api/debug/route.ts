import { NextResponse } from "next/server";

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "NOT_SET";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "NOT_SET";
  const backend = process.env.BACKEND_URL ?? "NOT_SET";

  // Test Supabase connection directly
  let supabaseTest = "not_tested";
  if (url !== "NOT_SET" && key !== "NOT_SET") {
    try {
      const res = await fetch(
        `${url}/rest/v1/quotations?select=count`,
        {
          headers: {
            "apikey": key,
            "Authorization": `Bearer ${key}`,
          },
        }
      );
      const text = await res.text();
      supabaseTest = `status:${res.status} body:${text}`;
    } catch (e) {
      supabaseTest = `error: ${e instanceof Error ? e.message : String(e)}`;
    }
  }

  return NextResponse.json({
    supabase_url:    url.substring(0, 30) + "...",
    supabase_key:    key.substring(0, 20) + "...",
    backend_url:     backend,
    supabase_test:   supabaseTest,
    node_env:        process.env.NODE_ENV,
  });
}
