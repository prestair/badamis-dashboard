"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

export type SavedRowState = {
  id:      string;
  desc:    string;
  size:    string;
  hsn:     string;
  section: string;
  qty:     number;
  rate:    number | null;
  amt:     number | null;
  checked: boolean;
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
  afterDiscount:number;
  gst:          number;
  grandTotal:   number;
  savedAt:      string;
};

type QuotationContextValue = {
  quotations:      SavedQuotation[];
  loading:         boolean;
  saveQuotation:   (q: Omit<SavedQuotation, "dbId" | "serialNo" | "savedAt">) => Promise<number>;
  updateQuotation: (dbId: string, q: Omit<SavedQuotation, "dbId" | "serialNo" | "savedAt">) => Promise<void>;
  deleteQuotation: (dbId: string) => Promise<void>;
  totalCount:      number;
  refresh:         () => Promise<void>;
};

// ── helpers ───────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(r: any): SavedQuotation {
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
    rows:         Array.isArray(r.rows) ? r.rows : [],
    gross:        Number(r.gross)         || 0,
    discount:     Number(r.discount)      || 0,
    afterDiscount:Number(r.after_discount)|| 0,
    gst:          Number(r.gst)           || 0,
    grandTotal:   Number(r.grand_total)   || 0,
    savedAt:      r.saved_at      ?? "",
  };
}

function toPayload(q: Omit<SavedQuotation, "dbId" | "serialNo" | "savedAt">) {
  return {
    quotationNo:   q.quotationNo,
    date:          q.date,
    partyName:     q.partyName,
    partyAddress:  q.partyAddress,
    partyGST:      q.partyGST,
    subject:       q.subject,
    attention:     q.attention,
    rows:          q.rows,
    gross:         q.gross,
    discount:      q.discount,
    afterDiscount: q.afterDiscount,
    gst:           q.gst,
    grandTotal:    q.grandTotal,
  };
}

// ── Context ───────────────────────────────────────────────────────────────────

const QuotationContext = createContext<QuotationContextValue | null>(null);

export function QuotationProvider({ children }: { children: ReactNode }) {
  const [quotations, setQuotations] = useState<SavedQuotation[]>([]);
  const [loading,    setLoading]    = useState(true);

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

  // ── save new quotation ─────────────────────────────────────────────────────
  async function saveQuotation(
    q: Omit<SavedQuotation, "dbId" | "serialNo" | "savedAt">
  ): Promise<number> {
    const res  = await fetch("/api/quotations", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(toPayload(q)),
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
    q: Omit<SavedQuotation, "dbId" | "serialNo" | "savedAt">
  ): Promise<void> {
    const res  = await fetch(`/api/quotations/${dbId}`, {
      method:  "PUT",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(toPayload(q)),
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
    const res = await fetch(`/api/quotations/${dbId}`, { method: "DELETE" });
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
        loading,
        saveQuotation,
        updateQuotation,
        deleteQuotation,
        totalCount: quotations.length,
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
