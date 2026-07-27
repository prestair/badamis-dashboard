import { NextResponse } from "next/server";

const BACKEND = process.env.BACKEND_URL;

function getFileStore() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { updateQuotation, deleteQuotation } = require("@/lib/fileStore");
  return { updateQuotation, deleteQuotation };
}

// PUT — update existing quotation
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body   = await req.json();

    if (BACKEND) {
      const res  = await fetch(`${BACKEND}/api/quotations/${id}`, {
        method:  "PUT",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(body),
      });
      const data = await res.json();
      return NextResponse.json(data, { status: res.status });
    }

    const { updateQuotation } = getFileStore();
    const updated = updateQuotation(id, {
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
    });
    if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(updated);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// DELETE — remove a quotation
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (BACKEND) {
      const res = await fetch(`${BACKEND}/api/quotations/${id}`, { method: "DELETE" });
      const data = await res.json();
      return NextResponse.json(data, { status: res.status });
    }

    const { deleteQuotation } = getFileStore();
    const ok = deleteQuotation(id);
    if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
