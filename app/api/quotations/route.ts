import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// GET — fetch all quotations
export async function GET() {
  const { data, error } = await supabase
    .from("quotations")
    .select("*")
    .order("serial_no", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// POST — create new quotation
export async function POST(req: Request) {
  const body = await req.json();

  const { data, error } = await supabase
    .from("quotations")
    .insert([{
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
    }])
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
