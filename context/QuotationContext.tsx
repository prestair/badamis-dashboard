"use client";

import { createContext, useContext, useState, ReactNode } from "react";

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
  saveQuotation:   (q: Omit<SavedQuotation, "serialNo" | "savedAt">) => number;
  updateQuotation: (serialNo: number, q: Omit<SavedQuotation, "serialNo" | "savedAt">) => void;
  deleteQuotation: (serialNo: number) => void;
  totalCount:      number;
};

const QuotationContext = createContext<QuotationContextValue | null>(null);

export function QuotationProvider({ children }: { children: ReactNode }) {
  const [quotations, setQuotations] = useState<SavedQuotation[]>([]);

  function saveQuotation(q: Omit<SavedQuotation, "serialNo" | "savedAt">): number {
    const serial = quotations.length + 1;
    const newQ: SavedQuotation = { ...q, serialNo: serial, savedAt: new Date().toISOString() };
    setQuotations((prev) => [...prev, newQ]);
    return serial;
  }

  function updateQuotation(serialNo: number, q: Omit<SavedQuotation, "serialNo" | "savedAt">) {
    setQuotations((prev) =>
      prev.map((existing) =>
        existing.serialNo === serialNo
          ? { ...q, serialNo, savedAt: new Date().toISOString() }
          : existing
      )
    );
  }

  function deleteQuotation(serialNo: number) {
    setQuotations((prev) => prev.filter((q) => q.serialNo !== serialNo));
  }

  return (
    <QuotationContext.Provider
      value={{ quotations, saveQuotation, updateQuotation, deleteQuotation, totalCount: quotations.length }}
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
