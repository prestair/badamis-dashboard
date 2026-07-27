import { NextResponse } from "next/server";

const BACKEND      = process.env.BACKEND_URL;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

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

function getFileStore() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { updateQuotation, deleteQuotation } = require("@/lib/fileStore");
  return { updateQuotation, deleteQuotation };
}

// ── PUT update quotation ──────────────────────────────────────────────────────
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body   = await req.json();
    const row    = {
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

    // 1. Local Express
    if (BACKEND) {
      const res  = await fetch(`${BACKEND}/api/quotations/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      return NextResponse.json(data, { status: res.status });
    }

    // 2. Supabase
    if (SUPABASE_URL && SUPABASE_KEY) {
      const res  = await supabaseRequest(`/quotations?id=eq.${id}`, {
        method: "PATCH",
        body: JSON.stringify(row),
      });
      const data = await res.json();
      const updated = Array.isArray(data) ? data[0] : data;
      if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
      return NextResponse.json(updated);
    }

    // 3. File fallback
    const { updateQuotation } = getFileStore();
    const updated = updateQuotation(id, row);
    if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(updated);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// ── DELETE quotation ──────────────────────────────────────────────────────────
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 1. Local Express
    if (BACKEND) {
      const res  = await fetch(`${BACKEND}/api/quotations/${id}`, { method: "DELETE" });
      const data = await res.json();
      return NextResponse.json(data, { status: res.status });
    }

    // 2. Supabase
    if (SUPABASE_URL && SUPABASE_KEY) {
      await supabaseRequest(`/quotations?id=eq.${id}`, { method: "DELETE" });
      return NextResponse.json({ success: true });
    }

    // 3. File fallback
    const { deleteQuotation } = getFileStore();
    const ok = deleteQuotation(id);
    if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
