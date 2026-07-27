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

// ── PUT update ────────────────────────────────────────────────────────────────
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body   = await req.json();

    // 1. Local Express
    if (BACKEND) {
      const res = await fetch(`${BACKEND}/api/quotations/${id}`, {
        method:  "PUT",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(body),
      });
      return NextResponse.json(await res.json(), { status: res.status });
    }

    // 2. Supabase
    const sb = getSupabaseClient();
    if (sb) {
      const { data, error } = await sb
        .from("quotations")
        .update(toRow(body))
        .eq("id", id)
        .select()
        .single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      if (!data)  return NextResponse.json({ error: "Not found" }, { status: 404 });
      return NextResponse.json(data);
    }

    // 3. File fallback
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { updateQuotation } = require("@/lib/fileStore");
    const updated = updateQuotation(id, toRow(body));
    if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(updated);
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Server error" },
      { status: 500 }
    );
  }
}

// ── DELETE ────────────────────────────────────────────────────────────────────
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 1. Local Express
    if (BACKEND) {
      const res = await fetch(`${BACKEND}/api/quotations/${id}`, { method: "DELETE" });
      return NextResponse.json(await res.json(), { status: res.status });
    }

    // 2. Supabase
    const sb = getSupabaseClient();
    if (sb) {
      const { error } = await sb.from("quotations").delete().eq("id", id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true });
    }

    // 3. File fallback
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { deleteQuotation } = require("@/lib/fileStore");
    if (!deleteQuotation(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Server error" },
      { status: 500 }
    );
  }
}
