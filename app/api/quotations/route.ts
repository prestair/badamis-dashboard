import { NextResponse } from "next/server";

const BACKEND      = process.env.BACKEND_URL;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// ── Supabase JS client (lazy) ─────────────────────────────────────────────────
function getSupabase() {
  const { createClient } = require("@supabase/supabase-js");
  return createClient(SUPABASE_URL!, SUPABASE_KEY!);
}

// ── Local file store ──────────────────────────────────────────────────────────
function getFileStore() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { readAll, createQuotation } = require("@/lib/fileStore");
  return { readAll, createQuotation };
}

function toRow(body: Record<string, unknown>) {
  return {
    quotation_no:   body.quotationNo,
    date:           body.date,
    party_name:     body.partyName,
    party_address:  body.partyAddress,
    party_gst:      body.partyGST,
    subject:        body.subject,
    attention:      body.attention,
    rows:           body.rows,
    gross:          body.gross,
    discount:       body.discount,
    after_discount: body.afterDiscount,
    gst:            body.gst,
    grand_total:    body.grandTotal,
  };
}

// ── GET all ───────────────────────────────────────────────────────────────────
export async function GET() {
  try {
    // 1. Local Express
    if (BACKEND) {
      const res  = await fetch(`${BACKEND}/api/quotations`, { cache: "no-store" });
      return NextResponse.json(await res.json());
    }
    // 2. Supabase
    if (SUPABASE_URL && SUPABASE_KEY) {
      const sb = getSupabase();
      const { data, error } = await sb.from("quotations").select("*").order("serial_no", { ascending: true });
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json(data ?? []);
    }
    // 3. File fallback
    return NextResponse.json(getFileStore().readAll());
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Server error" }, { status: 500 });
  }
}

// ── POST create ───────────────────────────────────────────────────────────────
export async function POST(req: Request) {
  try {
    const body = await req.json();

    // 1. Local Express
    if (BACKEND) {
      const res = await fetch(`${BACKEND}/api/quotations`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      return NextResponse.json(await res.json(), { status: 201 });
    }
    // 2. Supabase
    if (SUPABASE_URL && SUPABASE_KEY) {
      const sb = getSupabase();
      const { data, error } = await sb.from("quotations").insert([toRow(body)]).select().single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json(data, { status: 201 });
    }
    // 3. File fallback
    return NextResponse.json(getFileStore().createQuotation(toRow(body)), { status: 201 });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Server error" }, { status: 500 });
  }
}
