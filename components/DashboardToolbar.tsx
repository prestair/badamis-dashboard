"use client";

import { useQuotations } from "@/context/QuotationContext";

export default function DashboardToolbar() {
  const { filteredQuotations, dateFrom, dateTo, setDateFrom, setDateTo } = useQuotations();

  return (
    <div className="flex items-center gap-3 flex-wrap py-2 no-print animate-fade-in">
      <div className="flex items-center gap-2 bg-white/5 border border-white/15 rounded-lg px-3 py-1.5">
        <span className="text-[10px] text-blue-200 uppercase tracking-wider font-semibold">Filter:</span>
        <input
          type="date"
          value={dateFrom}
          onChange={(event) => setDateFrom(event.target.value)}
          className="bg-transparent border border-white/20 rounded px-2 py-0.5 text-xs text-white focus:outline-none focus:border-blue-400 w-28"
          title="From date"
        />
        <span className="text-white/40 text-xs">→</span>
        <input
          type="date"
          value={dateTo}
          onChange={(event) => setDateTo(event.target.value)}
          className="bg-transparent border border-white/20 rounded px-2 py-0.5 text-xs text-white focus:outline-none focus:border-blue-400 w-28"
          title="To date"
        />
        {(dateFrom || dateTo) && (
          <button
            type="button"
            onClick={() => { setDateFrom(""); setDateTo(""); }}
            className="text-[10px] text-red-300 hover:text-red-200 font-bold"
            aria-label="Clear date filter"
          >
            ✕
          </button>
        )}
        {(dateFrom || dateTo) && (
          <span className="text-[10px] text-green-300 font-bold">{filteredQuotations.length} found</span>
        )}
      </div>
    </div>
  );
}
