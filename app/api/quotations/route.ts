import { NextResponse } from "next/server";

// If BACKEND_URL is set (on Vercel), proxy to local Express server
// Otherwise use local file storage (when running npm run dev locally)
const BACKEND = process.env.BACKEND_URL; // e.g. http://YOUR_IP:5000

// ── Local file storage (fallback when no BACKEND_URL) ─────────────────────
function getFileStore() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { readAll, createQuotation } = require("@/lib/fileStore");
  return { readAll, createQuotation };
}

// GET — fetch all quotations
export async function GET() {
  try {
    if (BACKEND) {
      const res  = await fetch(`${BACKEND}/api/quotations`, { cache: "no-store" });
      const data = await res.json();
      return NextResponse.json(data, { status: res.status });
    }
    const { readAll } = getFileStore();
    return NextResponse.json(readAll());
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// POST — create new quotation
export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (BACKEND) {
      const res  = await fetch(`${BACKEND}/api/quotations`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(body),
      });
      const data = await res.json();
      return NextResponse.json(data, { status: res.status });
    }

    const { createQuotation } = getFileStore();
    const newQ = createQuotation({
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
    return NextResponse.json(newQ, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
