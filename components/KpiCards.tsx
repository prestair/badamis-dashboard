"use client";

import { useDashboard } from "@/context/DashboardContext";
import { QUOTATION_META, fmtINR } from "@/lib/data";

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
  const { items, gross, gst, grandTotal } = useDashboard();

  const pricedItems = items.filter((i) => i.amt !== null).length;
  const nqItems = items.filter((i) => i.amt === null).length;
  // discount keeps the original fixed amount; after-discount = gross - discount
  const discount = QUOTATION_META.discount;
  const afterDiscount = Math.max(0, gross - discount);

  const cards: KpiProps[] = [
    {
      label: "Total Items",
      value: String(items.length),
      sub: `${pricedItems} priced · ${nqItems} NQ`,
      accent: "#2563eb",
    },
    {
      label: "Gross Amount",
      value: fmtINR(gross),
      sub: "Before discount",
      accent: "#16a34a",
    },
    {
      label: "Discount",
      value: fmtINR(discount),
      sub: `${gross > 0 ? ((discount / gross) * 100).toFixed(2) : "0.00"}% off gross`,
      accent: "#ea580c",
    },
    {
      label: "After Discount",
      value: fmtINR(afterDiscount),
      sub: "Net taxable value",
      accent: "#7c3aed",
    },
    {
      label: "GST @ 18%",
      value: fmtINR(gst),
      sub: "On gross amount",
      accent: "#dc2626",
    },
    {
      label: "Grand Total",
      value: fmtINR(grandTotal),
      sub: "Including all taxes",
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
