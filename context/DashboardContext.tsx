"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  ReactNode,
} from "react";
import {
  ALL_ITEMS,
  QuotationItem,
  SECTION_COLORS,
  SECTIONS,
} from "@/lib/data";

// ── types ────────────────────────────────────────────────────────────────────

type SectionTotal = {
  section: string;
  amt: number;
  count: number;
  color: string;
};

type DashboardContextValue = {
  items: QuotationItem[];
  addItem: (item: QuotationItem) => void;
  updateItem: (id: string, updated: QuotationItem) => void;
  removeItem: (id: string) => void;
  // derived
  sectionTotals: SectionTotal[];
  top10: QuotationItem[];
  gross: number;
  gst: number;
  grandTotal: number;
};

// ── context ──────────────────────────────────────────────────────────────────

const DashboardContext = createContext<DashboardContextValue | null>(null);

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<QuotationItem[]>(ALL_ITEMS);

  const addItem = useCallback((item: QuotationItem) => {
    setItems((prev) => [...prev, item]);
  }, []);

  const updateItem = useCallback((id: string, updated: QuotationItem) => {
    setItems((prev) => prev.map((i) => (i.id === id ? updated : i)));
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const sectionTotals: SectionTotal[] = useMemo(() => {
    // include any custom sections that came in via new entries
    const allSections = Array.from(new Set([...SECTIONS, ...items.map((i) => i.section)]));
    return allSections.map((section) => ({
      section,
      amt: items
        .filter((i) => i.section === section && i.amt !== null)
        .reduce((s, i) => s + (i.amt ?? 0), 0),
      count: items.filter((i) => i.section === section).length,
      color: SECTION_COLORS[section] ?? "#94a3b8",
    }));
  }, [items]);

  const top10 = useMemo(
    () =>
      [...items]
        .filter((i) => i.amt !== null)
        .sort((a, b) => (b.amt ?? 0) - (a.amt ?? 0))
        .slice(0, 10),
    [items]
  );

  const gross = useMemo(
    () => items.filter((i) => i.amt !== null).reduce((s, i) => s + (i.amt ?? 0), 0),
    [items]
  );

  const gst = useMemo(() => Math.round(gross * 0.18), [gross]);
  const grandTotal = useMemo(() => gross + gst, [gross, gst]);

  return (
    <DashboardContext.Provider
      value={{ items, addItem, updateItem, removeItem, sectionTotals, top10, gross, gst, grandTotal }}
    >
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  const ctx = useContext(DashboardContext);
  if (!ctx) throw new Error("useDashboard must be used inside DashboardProvider");
  return ctx;
}
