import { NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";
import { createAuditedRows, unpackQuotationRows } from "@/lib/quotationAudit";

const BACKEND = process.env.BACKEND_URL;

// Lightweight columns for the dashboard LIST — deliberately NO `rows` JSONB
// (that heavy payload is fetched on demand per-quotation via GET /:id). This is
// the core Supabase egress reduction.
const LIST_COLUMNS =
  "id, serial_no, quotation_no, date, party_name, party_address, party_gst, " +
  "subject, attention, requester, gross, discount, after_discount, gst, " +
  "grand_total, status, saved_at, created_by, edit_count";

// Same list minus the two flat audit columns, used as a fallback when the
// migration adding `created_by`/`edit_count` has not been applied yet.
const LIST_COLUMNS_NO_AUDIT =
  "id, serial_no, quotation_no, date, party_name, party_address, party_gst, " +
  "subject, attention, requester, gross, discount, after_discount, gst, " +
  "grand_total, status, saved_at";

function isMissingAuditColumnError(message: string | undefined): boolean {
  if (!message) return false;
  const m = message.toLowerCase();
  return m.includes("created_by") || m.includes("edit_count") ||
    m.includes("does not exist");
}

function toRow(
  body: Record<string, unknown>,
  rows: unknown = body.rows,
  extra?: Record<string, unknown>
) {
  return {
    quotation_no:   body.quotationNo,
    date:           body.date,
    party_name:     body.partyName,
    party_address:  body.partyAddress,
    party_gst:      body.partyGST,
    subject:        body.subject,
    attention:      body.attention,
    requester:      body.requester ?? "",
    rows,
    gross:          body.gross,
    discount:       body.discount,
    after_discount: body.afterDiscount,
    gst:            body.gst,
    grand_total:    body.grandTotal,
    status:         body.status ?? "active",
    ...(extra ?? {}),
  };
}

// ── GET all ───────────────────────────────────────────────────────────────────
export async function GET() {
  try {
    // 1. Local Express backend
    if (BACKEND) {
      try {
        const res = await fetch(`${BACKEND}/api/quotations`, { cache: "no-store" });
        if (res.ok) return NextResponse.json(await res.json());
      } catch {
        // Backend unreachable — fall through to Supabase/file
      }
    }

    // 2. Supabase (Vercel)
    const sb = getSupabaseClient();
    if (sb) {
      // Attempt the full lightweight select (incl. flat audit columns). If the
      // migration hasn't been applied, those columns don't exist yet, so retry
      // without them — egress savings (dropping `rows`) apply either way.
      let { data, error } = await sb
        .from("quotations")
        .select(LIST_COLUMNS)
        .order("serial_no", { ascending: true });
      if (error && isMissingAuditColumnError(error.message)) {
        ({ data, error } = await sb
          .from("quotations")
          .select(LIST_COLUMNS_NO_AUDIT)
          .order("serial_no", { ascending: true }));
      }
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json(data ?? []);
    }

    // 3. Local file fallback
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { readAll } = require("@/lib/fileStore");
    return NextResponse.json(readAll());
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Server error" },
      { status: 500 }
    );
  }
}

// ── POST create ───────────────────────────────────────────────────────────────
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const auditedRows = createAuditedRows(body.rows, body.actorName);
    const { audit } = unpackQuotationRows(auditedRows);
    const flatColumns = { created_by: audit.createdBy, edit_count: audit.editCount };

    // 1. Local Express
    if (BACKEND) {
      try {
        const res = await fetch(`${BACKEND}/api/quotations`, {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ ...body, rows: auditedRows, ...flatColumns }),
        });
        if (res.ok) return NextResponse.json(await res.json(), { status: 201 });
      } catch {
        // Backend unreachable — fall through
      }
    }

    // 2. Supabase
    const sb = getSupabaseClient();
    if (sb) {
      // Insert WITH the flat audit columns; retry WITHOUT them if the migration
      // hasn't added those columns yet.
      let { data, error } = await sb
        .from("quotations")
        .insert([toRow(body, auditedRows, flatColumns)])
        .select()
        .single();
      if (error && isMissingAuditColumnError(error.message)) {
        ({ data, error } = await sb
          .from("quotations")
          .insert([toRow(body, auditedRows)])
          .select()
          .single());
      }
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json(data, { status: 201 });
    }

    // 3. File fallback
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createQuotation } = require("@/lib/fileStore");
    return NextResponse.json(createQuotation(toRow(body, auditedRows, flatColumns)), { status: 201 });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Server error" },
      { status: 500 }
    );
  }
}
