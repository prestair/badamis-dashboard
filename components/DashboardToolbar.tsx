"use client";

import { useState } from "react";
import { useQuotations } from "@/context/QuotationContext";

export default function DashboardToolbar() {
  const { quotations } = useQuotations();
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo]     = useState("");

  // Filter quotations by date range
  const filtered = quotations.filter((q) => {
    if (dateFrom && q.date < dateFrom) return false;
    if (dateTo && q.date > dateTo) return false;
    return true;
  });

  // ── Export CSV ──────────────────────────────────────────────────────────────
  function exportCSV() {
    if (quotations.length === 0) { alert("No quotations to export."); return; }
    const headers = ["Serial No","Quotation No","Date","Party Name","Address","GST","Grand Total","Status"];
    const rows = (dateFrom || dateTo ? filtered : quotations).map((q) => [
      q.serialNo,
      q.quotationNo,
      q.date,
      q.partyName,
      q.partyAddress,
      q.partyGST,
      q.grandTotal,
      "Active",
    ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","));

    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `Prestair_Quotations_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── Print ──────────────────────────────────────────────────────────────────
  function handlePrint() {
    window.print();
  }

  return (
    <div className="flex items-center gap-3 flex-wrap py-2 no-print animate-fade-in">

      {/* Date Range Filter */}
      <div className="flex items-center gap-2 bg-white/5 border border-white/15 rounded-lg px-3 py-1.5">
        <span className="text-[10px] text-blue-200 uppercase tracking-wider font-semibold">Filter:</span>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="bg-transparent border border-white/20 rounded px-2 py-0.5 text-xs text-white focus:outline-none focus:border-blue-400 w-28"
          title="From date"
        />
        <span className="text-white/40 text-xs">→</span>
        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="bg-transparent border border-white/20 rounded px-2 py-0.5 text-xs text-white focus:outline-none focus:border-blue-400 w-28"
          title="To date"
        />
        {(dateFrom || dateTo) && (
          <button onClick={() => { setDateFrom(""); setDateTo(""); }}
            className="text-[10px] text-red-300 hover:text-red-200 font-bold">✕</button>
        )}
        {(dateFrom || dateTo) && (
          <span className="text-[10px] text-green-300 font-bold">{filtered.length} found</span>
        )}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Export CSV */}
      <button onClick={exportCSV}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold text-emerald-200 bg-emerald-500/20 border border-emerald-400/30 hover:bg-emerald-500/40 active:scale-95 transition-all"
        title="Export all quotations as CSV">
        📥 CSV
      </button>

      {/* Print */}
      <button onClick={handlePrint}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold text-white/70 bg-white/10 border border-white/20 hover:bg-white/20 active:scale-95 transition-all"
        title="Print dashboard">
        🖨️ Print
      </button>
    </div>
  );
}
