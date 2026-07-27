"use client";

import { useMemo } from "react";
import { useQuotations } from "@/context/QuotationContext";
import { ALL_ITEMS, fmtINR } from "@/lib/data";

type KpiProps = {
  label: string;
  value: string;
  sub: string;
  accent: string;
  textLight?: boolean;
};

function KpiCard({ label, value, sub, accent, textLight }: KpiProps) {
  return (
    <div
      className="rounded-xl p-5 shadow-sm border-l-4 flex flex-col gap-1"
      style={{
        background: textLight ? accent : "#fff",
        borderLeftColor: textLight ? "rgba(255,255,255,0.4)" : accent,
      }}
    >
      <span
        className="text-xs uppercase tracking-widest font-semibold"
        style={{ color: textLight ? "rgba(255,255,255,0.8)" : "#64748b" }}
      >
        {label}
      </span>
      <span
        className="text-2xl font-bold mt-1"
        style={{ color: textLight ? "#fff" : "#0f172a" }}
      >
        {value}
      </span>
      <span
        className="text-xs"
        style={{ color: textLight ? "rgba(255,255,255,0.65)" : "#94a3b8" }}
      >
        {sub}
      </span>
    </div>
  );
}

export default function KpiCards() {
  const { quotations, loading } = useQuotations();

  // ── Aggregate across ALL saved quotations ───────────────────────────────────
  const stats = useMemo(() => {
    if (quotations.length === 0) {
      // fallback: show static data from original excel when no quotations saved yet
      const pricedItems = ALL_ITEMS.filter((i) => i.amt !== null).length;
      const nqItems     = ALL_ITEMS.filter((i) => i.amt === null).length;
      const gross       = 3001000;
      const discount    = 261000;
      const afterDiscount = gross - discount;
      const gst         = Math.round(afterDiscount * 0.18);
      const grandTotal  = afterDiscount + gst;
      return { totalItems: ALL_ITEMS.length, pricedItems, nqItems, gross, discount, afterDiscount, gst, grandTotal };
    }

    // sum across all saved quotations
    const gross       = quotations.reduce((s, q) => s + q.gross, 0);
    const discount    = quotations.reduce((s, q) => s + q.discount, 0);
    const afterDiscount = quotations.reduce((s, q) => s + q.afterDiscount, 0);
    const gst         = quotations.reduce((s, q) => s + q.gst, 0);
    const grandTotal  = quotations.reduce((s, q) => s + q.grandTotal, 0);

    // total items across all quotation rows
    const allRows   = quotations.flatMap((q) => q.rows);
    const totalItems  = allRows.length;
    const pricedItems = allRows.filter((r) => r.amt !== null && r.amt > 0).length;
    const nqItems     = allRows.filter((r) => r.amt === null).length;

    return { totalItems, pricedItems, nqItems, gross, discount, afterDiscount, gst, grandTotal };
  }, [quotations]);

  const discPct = stats.gross > 0
    ? ((stats.discount / stats.gross) * 100).toFixed(2)
    : "0.00";

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-xl p-5 bg-white shadow-sm border-l-4 border-slate-200 animate-pulse">
            <div className="h-3 w-24 bg-slate-200 rounded mb-3" />
            <div className="h-8 w-32 bg-slate-200 rounded mb-2" />
            <div className="h-2 w-20 bg-slate-100 rounded" />
          </div>
        ))}
      </div>
    );
  }

  const cards: KpiProps[] = [
    {
      label: "Total Items",
      value: String(stats.totalItems),
      sub:   `${stats.pricedItems} priced · ${stats.nqItems} NQ`,
      accent: "#2563eb",
    },
    {
      label: "Gross Amount",
      value: fmtINR(stats.gross),
      sub:   "Before discount",
      accent: "#16a34a",
    },
    {
      label: "Discount",
      value: fmtINR(stats.discount),
      sub:   `${discPct}% off gross`,
      accent: "#ea580c",
    },
    {
      label: "After Discount",
      value: fmtINR(stats.afterDiscount),
      sub:   "Net taxable value",
      accent: "#7c3aed",
    },
    {
      label: "GST @ 18%",
      value: fmtINR(stats.gst),
      sub:   "On net amount",
      accent: "#dc2626",
    },
    {
      label: "Grand Total",
      value: fmtINR(stats.grandTotal),
      sub:   "Including all taxes",
      accent: "#0e7490",
      textLight: true,
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
      {cards.map((c) => (
        <KpiCard key={c.label} {...c} />
      ))}
    </div>
  );
}
