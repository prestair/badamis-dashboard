import { NextResponse } from "next/server";

function getSupabase() {
  const { supabase } = require("@/lib/supabase");
  return supabase;
}

// GET — fetch all quotations
export async function GET() {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("quotations")
      .select("*")
      .order("serial_no", { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// POST — create new quotation
export async function POST(req: Request) {
  try {
    const supabase = getSupabase();
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
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
