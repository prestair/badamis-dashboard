import { NextResponse } from "next/server";
import { getSupabaseClient, getSupabaseAdminClient } from "@/lib/supabase";
import { unpackQuotationRows, withQuotationDiscounts } from "@/lib/quotationAudit";

function isAdminRequest(req: Request) {
  return req.headers.get("x-user-role")?.trim().toLowerCase() === "admin";
}

// ── POST /api/quotations/trim-history ─────────────────────────────────────────
// Body: { beforeDate: "YYYY-MM-DD" }
// Trims editHistory entries older than beforeDate from every quotation's rows JSON.
// No other data is changed — party, items, totals, discounts all stay intact.
export async function POST(req: Request) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  try {
    const body = await req.json() as Record<string, unknown>;
    const beforeDate = String(body.beforeDate ?? "").trim();
    if (!beforeDate || !/^\d{4}-\d{2}-\d{2}$/.test(beforeDate)) {
      return NextResponse.json({ error: "beforeDate required in YYYY-MM-DD format." }, { status: 400 });
    }

    const cutoff = new Date(beforeDate);
    cutoff.setHours(0, 0, 0, 0);

    const sb  = getSupabaseClient();
    const adm = getSupabaseAdminClient();
    if (!sb || !adm) {
      return NextResponse.json({ error: "Database not configured." }, { status: 503 });
    }

    // Fetch all quotations — only columns we need
    const { data: rows, error: fetchErr } = await sb
      .from("quotations")
      .select("id, rows");
    if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 });
    if (!rows || rows.length === 0) return NextResponse.json({ trimmed: 0, total: 0 });

    let trimmedCount = 0;

    // Process in parallel batches of 20
    const BATCH = 20;
    for (let i = 0; i < rows.length; i += BATCH) {
      const batch = rows.slice(i, i + BATCH);
      await Promise.all(batch.map(async (q) => {
        const unpacked = unpackQuotationRows(q.rows);
        const originalLen = unpacked.audit.editHistory.length;

        // Keep only entries on or after the cutoff date
        const trimmed = unpacked.audit.editHistory.filter((entry) => {
          if (!entry.editedAt) return false; // no timestamp → drop
          const entryDate = new Date(entry.editedAt);
          return entryDate >= cutoff;
        });

        if (trimmed.length === originalLen) return; // nothing to trim

        // Rebuild audit with trimmed history
        const newAudit = {
          ...unpacked.audit,
          editHistory: trimmed,
          editCount: Math.max(unpacked.audit.editCount - (originalLen - trimmed.length), trimmed.length),
          editedBy: trimmed.length > 0 ? trimmed[trimmed.length - 1].name : unpacked.audit.createdBy,
        };

        // Rebuild the full rows array — items + discounts + partB + audit
        // We use withQuotationDiscounts to preserve discounts/partB, then append audit manually
        const itemsWithMeta = withQuotationDiscounts(
          unpacked.items,
          unpacked.discounts,
          unpacked.partBItems.length > 0 ? unpacked.partBItems : undefined,
        );
        const auditRow = {
          __quotationAudit: true,
          createdBy:   newAudit.createdBy,
          createdAt:   newAudit.createdAt,
          editedBy:    newAudit.editedBy,
          editCount:   newAudit.editCount,
          editHistory: newAudit.editHistory,
        };
        const newRows = [...itemsWithMeta, auditRow];

        const { error: updateErr } = await adm
          .from("quotations")
          .update({ rows: newRows })
          .eq("id", q.id);

        if (!updateErr) trimmedCount++;
      }));
    }

    return NextResponse.json({ trimmed: trimmedCount, total: rows.length });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Server error" },
      { status: 500 },
    );
  }
}
