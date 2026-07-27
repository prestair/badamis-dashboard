import { NextResponse } from "next/server";
import { readAll, createQuotation } from "@/lib/fileStore";

// GET — fetch all quotations
export async function GET() {
  try {
    const data = readAll();
    return NextResponse.json(data);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// POST — create new quotation
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const newQ = createQuotation({
      quotation_no:  body.quotationNo,
      date:          body.date,
      party_name:    body.partyName,
      party_address: body.partyAddress,
      party_gst:     body.partyGST,
      subject:       body.subject,
      attention:     body.attention,
      rows:          body.rows,
      gross:         body.gross,
      discount:      body.discount,
      after_discount:body.afterDiscount,
      gst:           body.gst,
      grand_total:   body.grandTotal,
    });
    return NextResponse.json(newQ, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
