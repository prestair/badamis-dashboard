"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useQuotations, SavedQuotation } from "@/context/QuotationContext";

const QuotationModal = dynamic(() => import("@/components/QuotationModal"), { ssr: false });

export default function HeaderActions() {
  const { quotations, totalCount, deleteQuotation, loading } = useQuotations();
  const [showCreate,    setShowCreate]    = useState(false);
  const [editQuotation, setEditQuotation] = useState<SavedQuotation | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null); // dbId

  const totalGrand = quotations.reduce((s, q) => s + q.grandTotal, 0);
  const fmt = (n: number) => "₹" + n.toLocaleString("en-IN");
  const blankRows = Math.max(0, 5 - totalCount);

  function handleDelete(dbId: string) {
    if (confirmDelete === dbId) {
      deleteQuotation(dbId);
      setConfirmDelete(null);
    } else {
      setConfirmDelete(dbId);
      setTimeout(() => setConfirmDelete((cur) => cur === dbId ? null : cur), 3000);
    }
  }

  return (
    <>
      {/* ── ROW 2: Buttons ── */}
      <div className="flex items-center justify-center gap-4 py-3 border-b border-white/10">

        {/* Total Quotation */}
        <div className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold bg-white/10 border border-white/30 backdrop-blur-sm">
          <span className="text-blue-200 text-xs">Total Quotation</span>
          <span className="text-white font-bold text-base">
            {loading ? "…" : totalCount}
          </span>
          {totalCount > 0 && (
            <>
              <span className="text-white/30">|</span>
              <span className="text-green-300 font-bold">{fmt(totalGrand)}</span>
            </>
          )}
        </div>

        {/* Create New */}
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold bg-green-600 hover:bg-green-700 active:scale-95 transition-all shadow-md"
        >
          <span className="text-base leading-none">+</span>
          Create New
        </button>

        {/* Edit last */}
        <button
          onClick={() => {
            if (quotations.length > 0) setEditQuotation(quotations[quotations.length - 1]);
            else setShowCreate(true);
          }}
          className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold bg-blue-600 hover:bg-blue-700 active:scale-95 transition-all shadow-md"
        >
          <span>✏️</span>
          Edit
        </button>
      </div>

      {/* ── ROW 3: Quotations table ── */}
      <div className="pb-4 pt-2">
        {loading ? (
          <div className="text-center text-blue-200 text-sm py-4 animate-pulse">
            Loading quotations…
          </div>
        ) : (
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-white/10 text-blue-100 text-[11px]">
                <th className="border border-white/15 px-3 py-2 text-center w-10">No.</th>
                <th className="border border-white/15 px-3 py-2 text-left">Quotation No.</th>
                <th className="border border-white/15 px-3 py-2 text-left">Date</th>
                <th className="border border-white/15 px-3 py-2 text-left">Party Name</th>
                <th className="border border-white/15 px-3 py-2 text-left">Address</th>
                <th className="border border-white/15 px-3 py-2 text-right">Grand Total</th>
                <th className="border border-white/15 px-3 py-2 text-center" style={{ width: 110 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {/* Saved rows */}
              {quotations.map((q) => (
                <tr key={q.dbId} className="hover:bg-white/5 transition-colors">
                  <td className="border border-white/10 px-3 py-2 text-center text-white font-bold">
                    {q.serialNo}
                  </td>
                  <td className="border border-white/10 px-3 py-2 text-blue-100 font-mono text-[10px]">
                    {q.quotationNo || "—"}
                  </td>
                  <td className="border border-white/10 px-3 py-2 text-white/80">{q.date}</td>
                  <td className="border border-white/10 px-3 py-2 text-white font-semibold">{q.partyName}</td>
                  <td className="border border-white/10 px-3 py-2 text-white/60 max-w-[160px] truncate">
                    {q.partyAddress || "—"}
                  </td>
                  <td className="border border-white/10 px-3 py-2 text-right text-green-300 font-bold font-mono">
                    ₹{q.grandTotal.toLocaleString("en-IN")}
                  </td>
                  <td className="border border-white/10 px-2 py-2 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => setEditQuotation(q)}
                        className="px-2 py-0.5 rounded bg-blue-500/40 hover:bg-blue-500/70 text-white text-[10px] font-bold transition-all"
                      >
                        ✏️ Edit
                      </button>
                      <button
                        onClick={() => handleDelete(q.dbId)}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                          confirmDelete === q.dbId
                            ? "bg-red-600 hover:bg-red-700 text-white animate-pulse"
                            : "bg-red-500/30 hover:bg-red-500/60 text-red-200"
                        }`}
                      >
                        {confirmDelete === q.dbId ? "Confirm?" : "🗑 Del"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {/* Blank rows */}
              {Array.from({ length: blankRows }).map((_, i) => (
                <tr key={`blank-${i}`}>
                  <td className="border border-white/10 px-3 py-2.5 text-center text-white/30 font-semibold">
                    {totalCount + i + 1}
                  </td>
                  <td className="border border-white/10 px-3 py-2.5 text-white/10">—</td>
                  <td className="border border-white/10 px-3 py-2.5">&nbsp;</td>
                  <td className="border border-white/10 px-3 py-2.5">&nbsp;</td>
                  <td className="border border-white/10 px-3 py-2.5">&nbsp;</td>
                  <td className="border border-white/10 px-3 py-2.5">&nbsp;</td>
                  <td className="border border-white/10 px-3 py-2.5">&nbsp;</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modals */}
      {showCreate && <QuotationModal onClose={() => setShowCreate(false)} />}
      {editQuotation && (
        <QuotationModal onClose={() => setEditQuotation(null)} initialData={editQuotation} />
      )}
    </>
  );
}
