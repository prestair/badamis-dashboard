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
  rows:         SavedRowState[];
  gross:        number;
  discount:     number;
  discounts:    QuotationDiscounts;
  afterDiscount:number;
  gst:          number;
  grandTotal:   number;
  savedAt:      string;
  createdBy:    string;
  createdAt:    string;
  editedBy:     string;
  editCount:    number;
  editHistory:  QuotationEditEntry[];
};

type QuotationInput = Omit<
  SavedQuotation,
  "dbId" | "serialNo" | "savedAt" | "createdBy" | "createdAt" |
  "editedBy" | "editCount" | "editHistory"
>;

type QuotationContextValue = {
  quotations:         SavedQuotation[];
  filteredQuotations: SavedQuotation[];
  loading:            boolean;
  saveQuotation:      (q: QuotationInput, actorName: string) => Promise<number>;
  updateQuotation:    (dbId: string, q: QuotationInput, actorName: string) => Promise<void>;
  deleteQuotation:    (dbId: string) => Promise<void>;
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
    };
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(r: any): SavedQuotation {
  const { items, audit, discounts, hasDiscounts } = unpackQuotationRows(r.rows);
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
    },
    afterDiscount:Number(r.after_discount)|| 0,
    gst:          Number(r.gst)           || 0,
    grandTotal:   Number(r.grand_total)   || 0,
    savedAt:      r.saved_at      ?? "",
    createdBy:    audit.createdBy,
    createdAt:    audit.createdAt || r.saved_at || "",
    editedBy:     audit.editedBy,
    editCount:    audit.editCount,
    editHistory:  audit.editHistory,
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
    rows:          withQuotationDiscounts(q.rows, q.discounts),
    gross:         q.gross,
    discount:      q.discount,
    afterDiscount: q.afterDiscount,
    gst:           q.gst,
    grandTotal:    q.grandTotal,
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
      if (Array.isArray(data)) setQuotations(data.map(mapRow));
    } catch (e) {
      console.error("Failed to fetch quotations", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  // Auto-refresh every 3 minutes
  useEffect(() => {
    const interval = setInterval(() => { refresh(); }, 3 * 60 * 1000);
    return () => clearInterval(interval);
  }, [refresh]);

  // ── save new quotation ─────────────────────────────────────────────────────
  async function saveQuotation(
    q: QuotationInput,
    actorName: string
  ): Promise<number> {
    const res  = await fetch("/api/quotations", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(toPayload(q, actorName)),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Save failed");
    const saved = mapRow(data);
    setQuotations((prev) => [...prev, saved]);
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

  return (
    <QuotationContext.Provider
      value={{
        quotations,
        filteredQuotations,
        loading,
        saveQuotation,
        updateQuotation,
        deleteQuotation,
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
