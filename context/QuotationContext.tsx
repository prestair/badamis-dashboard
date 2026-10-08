"use client";

import { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from "react";
import {
  QuotationDiscounts,
  QuotationEditEntry,
  buildQuotationChanges,
  unpackQuotationRows,
  withQuotationDiscounts,
} from "@/lib/quotationAudit";
import { useAuth } from "@/context/AuthContext";

// ── Types ─────────────────────────────────────────────────────────────────────

export type SavedRowState = {
  id:       string;
  rowType:  "item" | "section";
  desc:     string;
  size:     string;
  hsn:      string;
  section:  string;
  qty:               number;
  additionalColumn:  string;
  discount:          number;
  discountIsPerUnit: boolean;
  rate:              number | null;
  amt:      number | null;
  checked:  boolean;
  // ── New optional per-item dimension fields (on-screen entry only) ──
  // Persisted into the JSONB rows column; absent on OLD quotations (left undefined).
  // Never rendered in PDF/Excel export (those read only `size`).
  mmInch?:  "MM" | "INCH";
  dimL?:    string;
  dimB?:    string;
  dimH?:    string;
  dimBS?:   string;
};

export type SavedQuotation = {
  // internal DB id (uuid)
  dbId:         string;
  serialNo:     number;
  quotationNo:  string;
  date:         string;
  partyName:    string;
  partyAddress: string;
  partyGST:     string;
  subject:      string;
  attention:    string;
  requester:    string;
  rows:         SavedRowState[];
  gross:        number;
  discount:     number;
  discounts:    QuotationDiscounts;
  afterDiscount:number;
  gst:          number;
  grandTotal:   number;
  status:       "active" | "completed";
  savedAt:      string;
  createdBy:    string;
  createdAt:    string;
  editedBy:     string;
  editCount:    number;
  editHistory:  QuotationEditEntry[];
  // Part B support
  partBRows?:   SavedRowState[];
};

type QuotationInput = Omit<
  SavedQuotation,
  "dbId" | "serialNo" | "savedAt" | "createdBy" | "createdAt" |
  "editedBy" | "editCount" | "editHistory" | "status"
> & {
  // status is optional here; callers that don't set it default to "active"
  status?: "active" | "completed";
};

type QuotationContextValue = {
  quotations:         SavedQuotation[];
  filteredQuotations: SavedQuotation[];
  loading:            boolean;
  saveQuotation:      (q: QuotationInput, actorName: string) => Promise<number>;
  saveQuotationFull:  (q: QuotationInput, actorName: string) => Promise<SavedQuotation>;
  updateQuotation:    (dbId: string, q: QuotationInput, actorName: string) => Promise<void>;
  loadQuotationDetail:(dbId: string) => Promise<SavedQuotation>;
  deleteQuotation:    (dbId: string) => Promise<void>;
  toggleQuotationStatus: (dbId: string, newStatus: "active" | "completed", actorName: string) => Promise<void>;
  totalCount:         number;
  currentFYCount:     number;
  searchQuery:        string;
  setSearchQuery:     (value: string) => void;
  hasActiveFilters:   boolean;
  dateFrom:           string;
  dateTo:             string;
  setDateFrom:        (value: string) => void;
  setDateTo:          (value: string) => void;
  refresh:            () => Promise<void>;
};

// ── helpers ───────────────────────────────────────────────────────────────────

function normalizeSavedRows(items: unknown[]): SavedRowState[] {
  return items.map((item, index) => {
    const row = item && typeof item === "object" ? item as Record<string, unknown> : {};
    const rawRate = row.rate;
    const rawAmount = row.amt;
    const rate = rawRate === null || rawRate === undefined || rawRate === ""
      ? null
      : Number(rawRate);
    const amount = rawAmount === null || rawAmount === undefined || rawAmount === ""
      ? null
      : Number(rawAmount);

    return {
      id: String(row.id ?? index + 1),
      rowType: row.rowType === "section" ? "section" : "item",
      desc: String(row.desc ?? ""),
      size: String(row.size ?? ""),
      hsn: String(row.hsn ?? ""),
      section: String(row.section ?? "Custom"),
      qty: Number(row.qty) || 0,
      additionalColumn: String(row.additionalColumn ?? ""),
      discount: Math.max(0, Number(row.discount) || 0),
      discountIsPerUnit: row.discountIsPerUnit === true,
      rate: rate !== null && Number.isFinite(rate) ? rate : null,
      amt: amount !== null && Number.isFinite(amount) ? amount : null,
      checked: row.checked !== false,
      // Preserve new dimension fields through reload. Absent fields stay
      // `undefined` so OLD rows carry no new keys and nothing changes for them.
      mmInch: row.mmInch === "INCH" ? "INCH" : (row.mmInch === "MM" ? "MM" : undefined),
      dimL: row.dimL !== undefined ? String(row.dimL) : undefined,
      dimB: row.dimB !== undefined ? String(row.dimB) : undefined,
      dimH: row.dimH !== undefined ? String(row.dimH) : undefined,
      dimBS: row.dimBS !== undefined ? String(row.dimBS) : undefined,
    };
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(r: any): SavedQuotation {
  const { items, partBItems, audit, discounts, hasDiscounts } = unpackQuotationRows(r.rows);
  const storedDiscount = Math.max(0, Number(r.discount) || 0);
  return {
    dbId:         r.id,
    serialNo:     r.serial_no,
    quotationNo:  r.quotation_no  ?? "",
    date:         r.date          ?? "",
    partyName:    r.party_name    ?? "",
    partyAddress: r.party_address ?? "",
    partyGST:     r.party_gst     ?? "",
    subject:      r.subject       ?? "",
    attention:    r.attention     ?? "",
    requester:    r.requester     ?? "",
    rows:         normalizeSavedRows(items),
    gross:        Number(r.gross)         || 0,
    discount:     storedDiscount,
    discounts:    hasDiscounts ? discounts : {
      seasonal: { enabled: false, amount: 0 },
      special: { enabled: false, amount: 0 },
      legacyAmount: Math.max(
        storedDiscount,
        Math.max(0, (Number(r.gross) || 0) - (Number(r.after_discount) || 0))
      ),
      transportationAmount: 0,
      packingAmount: 0,
      discountPercentA: 0,
      partBEnabled: false,
      discountPercentB: 0,
    },
    afterDiscount:Number(r.after_discount)|| 0,
    gst:          Number(r.gst)           || 0,
    grandTotal:   Number(r.grand_total)   || 0,
    status:       r.status === "completed" ? "completed" : "active",
    savedAt:      r.saved_at      ?? "",
    // Prefer the flat summary columns (present on LIST items without the heavy
    // `rows`). Fall back to the audit unpacked from `rows` for the detail fetch
    // and the local file backend. `createdBy`/`editCount` drive the list badge
    // and the charts, so they must be populated even when `rows` is absent.
    createdBy:    (typeof r.created_by === "string" && r.created_by)
                    ? r.created_by
                    : audit.createdBy,
    createdAt:    audit.createdAt || r.saved_at || "",
    editedBy:     audit.editedBy,
    editCount:    r.edit_count !== undefined && r.edit_count !== null
                    ? Math.max(Number(r.edit_count) || 0, audit.editCount)
                    : audit.editCount,
    editHistory:  audit.editHistory,
    partBRows:    partBItems.length > 0 ? normalizeSavedRows(partBItems) : undefined,
  };
}

type PreviousAudit = Pick<
  SavedQuotation,
  "createdBy" | "createdAt" | "editedBy" | "editCount" | "editHistory"
>;

function toPayload(
  q: QuotationInput,
  actorName: string,
  previousAudit?: PreviousAudit,
  changes = [] as ReturnType<typeof buildQuotationChanges>
) {
  return {
    quotationNo:   q.quotationNo,
    date:          q.date,
    partyName:     q.partyName,
    partyAddress:  q.partyAddress,
    partyGST:      q.partyGST,
    subject:       q.subject,
    attention:     q.attention,
    requester:     q.requester,
    rows:          withQuotationDiscounts(q.rows, q.discounts, q.partBRows),
    gross:         q.gross,
    discount:      q.discount,
    afterDiscount: q.afterDiscount,
    gst:           q.gst,
    grandTotal:    q.grandTotal,
    status:        q.status ?? "active",
    actorName,
    previousAudit,
    changes,
  };
}

// ── Context ───────────────────────────────────────────────────────────────────

const QuotationContext = createContext<QuotationContextValue | null>(null);

export function QuotationProvider({ children }: { children: ReactNode }) {
  const { loggedRole } = useAuth();
  const [quotations, setQuotations] = useState<SavedQuotation[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [dateFrom,   setDateFrom]   = useState("");
  const [dateTo,     setDateTo]     = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const normalizedSearchQuery = searchQuery.trim().toLowerCase();
  const hasActiveFilters = Boolean(normalizedSearchQuery || dateFrom || dateTo);
  const filteredQuotations = useMemo(() => quotations.filter((quotation) => {
    if (dateFrom && quotation.date < dateFrom) return false;
    if (dateTo && quotation.date > dateTo) return false;
    if (!normalizedSearchQuery) return true;

    const primaryValues = [
      quotation.createdBy,
      quotation.editedBy,
      quotation.quotationNo,
      quotation.partyName,
    ];
    const matchesPrimaryValue = primaryValues.some((value) =>
      String(value ?? "").toLowerCase().includes(normalizedSearchQuery)
    );
    const matchesHistoricalUser = quotation.editHistory.some((entry) =>
      entry.name.toLowerCase().includes(normalizedSearchQuery)
    );

    return matchesPrimaryValue || matchesHistoricalUser;
  }), [quotations, normalizedSearchQuery, dateFrom, dateTo]);

  // ── fetch all from DB ──────────────────────────────────────────────────────
  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch("/api/quotations");
      const data = await res.json();
      if (Array.isArray(data)) setQuotations(data.map(mapRow).sort((a, b) => b.serialNo - a.serialNo));
    } catch (e) {
      console.error("Failed to fetch quotations", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  // Auto-refresh every 20 minutes — reduced to save Supabase egress
  useEffect(() => {
    const interval = setInterval(() => { refresh(); }, 20 * 60 * 1000);
    return () => clearInterval(interval);
  }, [refresh]);

  // ── load full detail for ONE quotation (on demand) ─────────────────────────
  // The LIST omits the heavy `rows`; call this before View / Edit / Copy /
  // Print / Edit-History so the consumer gets full items + edit history. The
  // fetched detail is cached in place so later reads (status toggle, re-open,
  // updateQuotation's previousAudit) operate on complete data.
  const loadQuotationDetail = useCallback(async (dbId: string): Promise<SavedQuotation> => {
    const res = await fetch(`/api/quotations/${dbId}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error ?? "Failed to load quotation detail");
    const full = mapRow(data);
    setQuotations((prev) => prev.map((x) => (x.dbId === dbId ? full : x)));
    return full;
  }, []);

  // ── save new quotation ─────────────────────────────────────────────────────
  // Create a new quotation and return the FULL saved record (id + serial etc.)
  async function saveQuotationFull(
    q: QuotationInput,
    actorName: string
  ): Promise<SavedQuotation> {
    const res  = await fetch("/api/quotations", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(toPayload(q, actorName)),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Save failed");
    const saved = mapRow(data);
    setQuotations((prev) => [saved, ...prev]);
    return saved;
  }

  // Backward-compatible wrapper returning just the serial number
  async function saveQuotation(
    q: QuotationInput,
    actorName: string
  ): Promise<number> {
    const saved = await saveQuotationFull(q, actorName);
    return saved.serialNo;
  }

  // ── update existing ────────────────────────────────────────────────────────
  async function updateQuotation(
    dbId: string,
    q: QuotationInput,
    actorName: string
  ): Promise<void> {
    const existing = quotations.find((quotation) => quotation.dbId === dbId);
    if (!existing) throw new Error("Quotation not found.");

    const normalizedInput: QuotationInput = {
      ...q,
      quotationNo: loggedRole === "admin" ? q.quotationNo : existing.quotationNo,
    };
    const previousAudit = {
      createdBy: existing.createdBy,
      createdAt: existing.createdAt,
      editedBy: existing.editedBy,
      editCount: existing.editCount,
      editHistory: existing.editHistory,
    };
    const changes = buildQuotationChanges(existing, normalizedInput);

    const res  = await fetch(`/api/quotations/${dbId}`, {
      method:  "PUT",
      headers: {
        "Content-Type": "application/json",
        "x-user-role": loggedRole ?? "",
      },
      body:    JSON.stringify(toPayload(normalizedInput, actorName, previousAudit, changes)),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Update failed");
    const updated = mapRow(data);
    setQuotations((prev) =>
      prev.map((old) => (old.dbId === dbId ? updated : old))
    );
  }

  // ── delete ─────────────────────────────────────────────────────────────────
  async function deleteQuotation(dbId: string): Promise<void> {
    if (loggedRole !== "admin") throw new Error("Admin access required to delete quotations.");

    const res = await fetch(`/api/quotations/${dbId}`, {
      method: "DELETE",
      headers: { "x-user-role": loggedRole },
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error ?? "Delete failed");
    }
    setQuotations((prev) => prev.filter((q) => q.dbId !== dbId));
  }

  // ── toggle status ─────────────────────────────────────────────────────────
  async function toggleQuotationStatus(
    dbId: string,
    newStatus: "active" | "completed",
    actorName: string
  ): Promise<void> {
    const existing = quotations.find((quotation) => quotation.dbId === dbId);
    if (!existing) throw new Error("Quotation not found.");

    const updatedQuotation: QuotationInput = {
      quotationNo: existing.quotationNo,
      date: existing.date,
      partyName: existing.partyName,
      partyAddress: existing.partyAddress,
      partyGST: existing.partyGST,
      subject: existing.subject,
      attention: existing.attention,
      requester: existing.requester,
      rows: existing.rows,
      gross: existing.gross,
      discount: existing.discount,
      discounts: existing.discounts,
      afterDiscount: existing.afterDiscount,
      gst: existing.gst,
      grandTotal: existing.grandTotal,
      status: newStatus,
      partBRows: existing.partBRows,
    };

    await updateQuotation(dbId, updatedQuotation, actorName);
  }

  return (
    <QuotationContext.Provider
      value={{
        quotations,
        filteredQuotations,
        loading,
        saveQuotation,
        saveQuotationFull,
        updateQuotation,
        loadQuotationDetail,
        deleteQuotation,
        toggleQuotationStatus,
        totalCount: quotations.length,
        currentFYCount: (() => {
          const now = new Date();
          const fyStartYear = now.getMonth() + 1 >= 4 ? now.getFullYear() : now.getFullYear() - 1;
          const fyStart = `${fyStartYear}-04-01`;
          return quotations.filter((q) => q.date >= fyStart).length;
        })(),
        searchQuery,
        setSearchQuery,
        hasActiveFilters,
        dateFrom,
        dateTo,
        setDateFrom,
        setDateTo,
        refresh,
      }}
    >
      {children}
    </QuotationContext.Provider>
  );
}

export function useQuotations() {
  const ctx = useContext(QuotationContext);
  if (!ctx) throw new Error("useQuotations must be inside QuotationProvider");
  return ctx;
}
