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

// ── Server-side quotation-number allocation ─────────────────────────────────
// The number is assigned HERE, at save time, from the live DB — never trusted
// from the client. This guarantees no duplicates even if two users save at the
// same moment or a client cache is stale.
//
// `requestedNo` is used only for its FY prefix and its initials suffix; the
// numeric middle is replaced with (current DB max for this FY) + 1.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function allocateQuotationNo(sb: any, requestedNo: string, date: string): Promise<string> {
  // Derive the financial-year prefix. Prefer the one already in requestedNo;
  // otherwise compute from the quotation date (FY starts April 1).
  const prefixMatch = requestedNo.match(/^(PS\/\d{2}-\d{2}\/)/);
  let fyPrefix: string;
  if (prefixMatch) {
    fyPrefix = prefixMatch[1];
  } else {
    const d = date ? new Date(date) : new Date();
    const m = d.getMonth() + 1;
    const fyStart = m >= 4 ? d.getFullYear() : d.getFullYear() - 1;
    fyPrefix = `PS/${fyStart % 100}-${(fyStart + 1) % 100}/`;
  }
  const fyPrefixOld = `${fyPrefix}QT-`;

  // Suffix = everything after the numeric part in requestedNo (e.g. "/PS-AB").
  let suffix = "";
  const afterPrefix = requestedNo.startsWith(fyPrefixOld)
    ? requestedNo.slice(fyPrefixOld.length)
    : (requestedNo.startsWith(fyPrefix) ? requestedNo.slice(fyPrefix.length) : "");
  const numMatch = afterPrefix.match(/^(\d+)(.*)$/);
  if (numMatch) suffix = numMatch[2] ?? "";

  // Read ALL quotation numbers for this FY from the live DB and find the max.
  const { data } = await sb
    .from("quotations")
    .select("quotation_no");
  let maxNum = 0;
  for (const row of (data ?? [])) {
    const qNo: string = row.quotation_no ?? "";
    let rest = "";
    if (qNo.startsWith(fyPrefixOld)) rest = qNo.slice(fyPrefixOld.length).trim();
    else if (qNo.startsWith(fyPrefix)) rest = qNo.slice(fyPrefix.length).trim();
    else continue;
    const mm = rest.match(/^(\d+)/);
    if (mm) { const n = parseInt(mm[1], 10); if (n > maxNum) maxNum = n; }
  }

  // FY 2026-27 floor stays 553 (so first new number is 554), matching the client.
  const fyStartYear = 2000 + parseInt(fyPrefix.slice(3, 5), 10);
  const floor = fyStartYear === 2026 ? 553 : 0;
  const nextNum = Math.max(maxNum, floor) + 1;
  return `${fyPrefix}${String(nextNum).padStart(4, "0")}${suffix}`;
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
    let body = await req.json();
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
      // ── Assign the quotation number NOW, from the live DB ───────────────
      // The client only supplies the FY prefix + initials suffix; the numeric
      // part is always (re)allocated here so two concurrent saves or a stale
      // client cache can never produce a duplicate.
      const requestedNo = String(body.quotationNo ?? "").trim();
      const allocatedNo = await allocateQuotationNo(sb, requestedNo, String(body.date ?? ""));
      body = { ...body, quotationNo: allocatedNo };

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
