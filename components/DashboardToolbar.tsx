"use client";

import { useQuotations } from "@/context/QuotationContext";

export default function DashboardToolbar() {
  const { filteredQuotations, dateFrom, dateTo, setDateFrom, setDateTo } = useQuotations();

  return (
    <div className="flex items-center gap-3 flex-wrap py-2 no-print animate-fade-in">
      <div className="flex items-center gap-2 bg-slate-100 border border-slate-200 rounded-lg px-3 py-1.5">
        <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Filter:</span>
        <input
          type="date"
          value={dateFrom}
          onChange={(event) => setDateFrom(event.target.value)}
          className="bg-white border border-slate-200 rounded px-2 py-0.5 text-xs text-slate-700 focus:outline-none focus:border-blue-400 w-28"
          title="From date"
        />
        <span className="text-slate-400 text-xs">→</span>
        <input
          type="date"
          value={dateTo}
          onChange={(event) => setDateTo(event.target.value)}
          className="bg-white border border-slate-200 rounded px-2 py-0.5 text-xs text-slate-700 focus:outline-none focus:border-blue-400 w-28"
          title="To date"
        />
        {(dateFrom || dateTo) && (
          <button
            type="button"
            onClick={() => { setDateFrom(""); setDateTo(""); }}
            className="text-[10px] text-red-500 hover:text-red-700 font-bold"
            aria-label="Clear date filter"
          >
            ✕
          </button>
        )}
        {(dateFrom || dateTo) && (
          <span className="text-[10px] text-green-600 font-bold">{filteredQuotations.length} found</span>
        )}
      </div>
    </div>
  );
}
