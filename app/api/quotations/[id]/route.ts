import { NextResponse } from "next/server";

function getSupabase() {
  const { supabase } = require("@/lib/supabase");
  return supabase;
}

// PUT — update existing quotation
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = getSupabase();
    const { id } = await params;
    const body = await req.json();

    const { data, error } = await supabase
      .from("quotations")
      .update({
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
      })
      .eq("id", id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
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
    const supabase = getSupabase();
    const { id } = await params;

    const { error } = await supabase
      .from("quotations")
      .delete()
      .eq("id", id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
