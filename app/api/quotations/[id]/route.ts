import { NextResponse } from "next/server";

const BACKEND      = process.env.BACKEND_URL;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function getSupabase() {
  const { createClient } = require("@supabase/supabase-js");
  return createClient(SUPABASE_URL!, SUPABASE_KEY!);
}

function getFileStore() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { updateQuotation, deleteQuotation } = require("@/lib/fileStore");
  return { updateQuotation, deleteQuotation };
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

// ── PUT update ────────────────────────────────────────────────────────────────
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body   = await req.json();

    // 1. Local Express
    if (BACKEND) {
      const res = await fetch(`${BACKEND}/api/quotations/${id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      return NextResponse.json(await res.json(), { status: res.status });
    }
    // 2. Supabase
    if (SUPABASE_URL && SUPABASE_KEY) {
      const sb = getSupabase();
      const { data, error } = await sb.from("quotations").update(toRow(body)).eq("id", id).select().single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      if (!data)  return NextResponse.json({ error: "Not found" }, { status: 404 });
      return NextResponse.json(data);
    }
    // 3. File fallback
    const { updateQuotation } = getFileStore();
    const updated = updateQuotation(id, toRow(body));
    if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(updated);
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Server error" }, { status: 500 });
  }
}

// ── DELETE ────────────────────────────────────────────────────────────────────
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    // 1. Local Express
    if (BACKEND) {
      const res = await fetch(`${BACKEND}/api/quotations/${id}`, { method: "DELETE" });
      return NextResponse.json(await res.json(), { status: res.status });
    }
    // 2. Supabase
    if (SUPABASE_URL && SUPABASE_KEY) {
      const sb = getSupabase();
      const { error } = await sb.from("quotations").delete().eq("id", id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true });
    }
    // 3. File fallback
    const { deleteQuotation } = getFileStore();
    if (!deleteQuotation(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Server error" }, { status: 500 });
  }
}
