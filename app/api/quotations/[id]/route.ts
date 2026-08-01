import { NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";
import { appendQuotationEdit } from "@/lib/quotationAudit";

const BACKEND = process.env.BACKEND_URL;

function isAdminRequest(req: Request) {
  return req.headers.get("x-user-role")?.trim().toLowerCase() === "admin";
}

function withoutQuotationNumberChanges(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.filter((change) => {
    if (!change || typeof change !== "object") return false;
    return (change as Record<string, unknown>).field !== "Quotation No.";
  });
}

function toRow(
  body: Record<string, unknown>,
  rows: unknown = body.rows,
  quotationNo: unknown = body.quotationNo
) {
  return {
    quotation_no:   quotationNo,
    date:           body.date,
    party_name:     body.partyName,
    party_address:  body.partyAddress,
    party_gst:      body.partyGST,
    subject:        body.subject,
    attention:      body.attention,
    rows,
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
    const body = await req.json() as Record<string, unknown>;
    const isAdmin = isAdminRequest(req);
    const safeChanges = isAdmin
      ? (Array.isArray(body.changes) ? body.changes : [])
      : withoutQuotationNumberChanges(body.changes);
    const fallbackRows = appendQuotationEdit(
      body.rows,
      [],
      body.actorName,
      new Date().toISOString(),
      body.previousAudit as Parameters<typeof appendQuotationEdit>[4],
      safeChanges
    );

    // 1. Local Express. The role is forwarded so the external service can
    // enforce the same rule when BACKEND_URL is configured.
    if (BACKEND) {
      try {
        const res = await fetch(`${BACKEND}/api/quotations/${id}`, {
          method:  "PUT",
          headers: {
            "Content-Type": "application/json",
            "x-user-role": isAdmin ? "admin" : "user",
          },
          body: JSON.stringify({
            ...body,
            rows: fallbackRows,
            changes: safeChanges,
            allowQuotationNumberChange: isAdmin,
          }),
        });
        if (res.ok) return NextResponse.json(await res.json());
      } catch {
        // Backend unreachable — fall through to Supabase/file
      }
    }

    // 2. Supabase
    const sb = getSupabaseClient();
    if (sb) {
      const { data: existing, error: readError } = await sb
        .from("quotations")
        .select("rows, quotation_no")
        .eq("id", id)
        .single();
      if (readError) return NextResponse.json({ error: readError.message }, { status: 500 });

      const auditedRows = appendQuotationEdit(
        body.rows,
        existing?.rows,
        body.actorName,
        new Date().toISOString(),
        body.previousAudit as Parameters<typeof appendQuotationEdit>[4],
        safeChanges
      );
      const quotationNo = isAdmin ? body.quotationNo : existing?.quotation_no;
      const { data, error } = await sb
        .from("quotations")
        .update(toRow(body, auditedRows, quotationNo))
        .eq("id", id)
        .select()
        .single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      if (!data)  return NextResponse.json({ error: "Not found" }, { status: 404 });
      return NextResponse.json(data);
    }

    // 3. File fallback
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { readAll, updateQuotation } = require("@/lib/fileStore");
    const existing = readAll().find((quotation: { id: string; rows?: unknown; quotation_no?: unknown }) => quotation.id === id);
    const auditedRows = appendQuotationEdit(
      body.rows,
      existing?.rows,
      body.actorName,
      new Date().toISOString(),
      body.previousAudit as Parameters<typeof appendQuotationEdit>[4],
      safeChanges
    );
    const quotationNo = isAdmin ? body.quotationNo : existing?.quotation_no;
    const updated = updateQuotation(id, toRow(body, auditedRows, quotationNo));
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
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAdminRequest(req)) {
    return NextResponse.json(
      { error: "Admin access required to delete quotations." },
      { status: 403 }
    );
  }

  try {
    const { id } = await params;

    // 1. Local Express
    if (BACKEND) {
      try {
        const res = await fetch(`${BACKEND}/api/quotations/${id}`, {
          method: "DELETE",
          headers: { "x-user-role": "admin" },
        });
        if (res.ok) return NextResponse.json(await res.json());
      } catch {
        // Backend unreachable — fall through
      }
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
