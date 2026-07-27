import { NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";

const BACKEND = process.env.BACKEND_URL;

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
    // 1. Local Express backend
    if (BACKEND) {
      const res = await fetch(`${BACKEND}/api/quotations`, { cache: "no-store" });
      return NextResponse.json(await res.json());
    }

    // 2. Supabase (Vercel)
    const sb = getSupabaseClient();
    if (sb) {
      const { data, error } = await sb
        .from("quotations")
        .select("*")
        .order("serial_no", { ascending: true });
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json(data ?? []);
    }

    // 3. Local file fallback
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { readAll } = require("@/lib/fileStore");
    return NextResponse.json(readAll());
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Server error" },
      { status: 500 }
    );
  }
}

// ── POST create ───────────────────────────────────────────────────────────────
export async function POST(req: Request) {
  try {
    const body = await req.json();

    // 1. Local Express
    if (BACKEND) {
      const res = await fetch(`${BACKEND}/api/quotations`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(body),
      });
      return NextResponse.json(await res.json(), { status: 201 });
    }

    // 2. Supabase
    const sb = getSupabaseClient();
    if (sb) {
      const { data, error } = await sb
        .from("quotations")
        .insert([toRow(body)])
        .select()
        .single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json(data, { status: 201 });
    }

    // 3. File fallback
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createQuotation } = require("@/lib/fileStore");
    return NextResponse.json(createQuotation(toRow(body)), { status: 201 });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Server error" },
      { status: 500 }
    );
  }
}
