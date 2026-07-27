import { NextResponse } from "next/server";

const BACKEND     = process.env.BACKEND_URL;       // local Express
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// ── Supabase helper ──────────────────────────────────────────────────────────
async function supabaseRequest(path: string, options: RequestInit = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    ...options,
    headers: {
      "apikey": SUPABASE_KEY!,
      "Authorization": `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      "Prefer": "return=representation",
      ...(options.headers || {}),
    },
  });
  return res;
}

// ── Local file store (only when running locally without BACKEND_URL) ─────────
function getFileStore() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { readAll, createQuotation } = require("@/lib/fileStore");
  return { readAll, createQuotation };
}

// ── GET all quotations ────────────────────────────────────────────────────────
export async function GET() {
  try {
    // 1. Local Express backend
    if (BACKEND) {
      const res  = await fetch(`${BACKEND}/api/quotations`, { cache: "no-store" });
      const data = await res.json();
      return NextResponse.json(data);
    }

    // 2. Supabase (Vercel)
    if (SUPABASE_URL && SUPABASE_KEY) {
      const res  = await supabaseRequest("/quotations?select=*&order=serial_no.asc");
      const data = await res.json();
      return NextResponse.json(Array.isArray(data) ? data : []);
    }

    // 3. Local file fallback
    const { readAll } = getFileStore();
    return NextResponse.json(readAll());
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// ── POST create quotation ─────────────────────────────────────────────────────
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const row  = {
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

    // 1. Local Express backend
    if (BACKEND) {
      const res  = await fetch(`${BACKEND}/api/quotations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      return NextResponse.json(data, { status: 201 });
    }

    // 2. Supabase (Vercel)
    if (SUPABASE_URL && SUPABASE_KEY) {
      const res  = await supabaseRequest("/quotations", {
        method: "POST",
        body: JSON.stringify(row),
      });
      const data = await res.json();
      const saved = Array.isArray(data) ? data[0] : data;
      return NextResponse.json(saved, { status: 201 });
    }

    // 3. Local file fallback
    const { createQuotation } = getFileStore();
    return NextResponse.json(createQuotation(row), { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
