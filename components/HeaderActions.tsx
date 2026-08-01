"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useQuotations, SavedQuotation } from "@/context/QuotationContext";
import { useAuth } from "@/context/AuthContext";

const QuotationModal     = dynamic(() => import("@/components/QuotationModal"),     { ssr: false });
const QuotationViewModal = dynamic(() => import("@/components/QuotationViewModal"), { ssr: false });
const ItemNameManager    = dynamic(() => import("@/components/ItemNameManager"),    { ssr: false });

type PageSize = 10 | 20 | 50 | 100;
const DEFAULT_PAGE_SIZE: PageSize = 20;

export default function HeaderActions() {
  const { loggedRole } = useAuth();

  // Format stored YYYY-MM-DD to DD/MM/YYYY
  function fmtDate(dateStr: string): string {
    if (!dateStr) return "";
    const [y, m, d] = dateStr.split("-");
    if (!y || !m || !d) return dateStr;
    return `${d}/${m}/${y}`;
  }
  const {
    quotations,
    filteredQuotations,
    searchQuery,
    setSearchQuery,
    deleteQuotation,
    refresh,
    loading,
    dateFrom,
    dateTo,
  } = useQuotations();
  const [showCreate,    setShowCreate]    = useState(false);
  const [showItemNames, setShowItemNames] = useState(false);
  const [editQuotation, setEditQuotation] = useState<SavedQuotation | null>(null);
  const [viewQuotation, setViewQuotation] = useState<SavedQuotation | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [pageSize]       = useState<PageSize>(DEFAULT_PAGE_SIZE);
  const [page,           setPage]           = useState(1);
  const [historyFor,     setHistoryFor]     = useState<string | null>(null);
  const [printingId,     setPrintingId]     = useState<string | null>(null);

  const totalGrand = filteredQuotations.reduce((sum, quotation) => sum + quotation.grandTotal, 0);
  const fmt = (n: number) => "₹" + n.toLocaleString("en-IN");
  const fmtWhen = (value: string) => {
    if (!value) return "Time unavailable";
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString("en-IN");
  };

  const totalPages = Math.max(1, Math.ceil(filteredQuotations.length / pageSize));

  useEffect(() => setPage(1), [searchQuery, dateFrom, dateTo]);
  useEffect(() => setPage((current) => Math.min(current, totalPages)), [totalPages]);
  useEffect(() => {
    if (!historyFor) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setHistoryFor(null);
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [historyFor]);

  const effectivePage = Math.min(page, totalPages);
  const startIndex = (effectivePage - 1) * pageSize;
  const visibleQuotations = filteredQuotations.slice(startIndex, startIndex + pageSize);
  const firstShown = filteredQuotations.length === 0 ? 0 : startIndex + 1;
  const lastShown = Math.min(startIndex + pageSize, filteredQuotations.length);

  async function handleDelete(dbId: string) {
    if (confirmDelete !== dbId) {
      setConfirmDelete(dbId);
      setTimeout(() => setConfirmDelete((cur) => (cur === dbId ? null : cur)), 3000);
      return;
    }

    try {
      await deleteQuotation(dbId);
      setConfirmDelete(null);
    } catch (error) {
      console.error("Delete failed", error);
      alert(error instanceof Error ? error.message : "Delete failed");
    }
  }

  function exportDisplayedCSV() {
    if (loading || visibleQuotations.length === 0) return;
    const headers = ["No.", "Quotation No.", "Date", "Party Name", "Address", "Grand Total", "User", "Edit Count"];
    const escapeCell = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;
    const rows = visibleQuotations.map((quotation) => [
      quotation.serialNo,
      quotation.quotationNo,
      fmtDate(quotation.date),
      quotation.partyName,
      quotation.partyAddress,
      quotation.grandTotal,
      quotation.editedBy || quotation.createdBy || "Unknown",
      quotation.editCount,
    ].map(escapeCell).join(","));
    const csv = `\uFEFF${[headers.map(escapeCell).join(","), ...rows].join("\n")}`;
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `Prestair_Displayed_Quotations_Page_${effectivePage}_${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  async function handlePrint(quotation: SavedQuotation) {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Please allow pop-ups to print the quotation.");
      return;
    }

    printWindow.document.write("<!doctype html><title>Preparing quotation</title><body style='font-family:Arial,sans-serif;padding:24px'>Preparing quotation for printing…</body>");
    printWindow.document.close();
    setPrintingId(quotation.dbId);
    try {
      const { printSavedQuotation } = await import("@/components/QuotationDownload");
      await printSavedQuotation(quotation, printWindow);
    } catch (error) {
      printWindow.close();
      console.error("Print failed", error);
      alert(`Print failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setPrintingId(null);
    }
  }

  return (
    <>
      {/* ── ROW 2: Action buttons ── */}
      <div className="flex flex-wrap items-center justify-center gap-3 py-3 border-b border-white/10">
        {/* Total */}
        <div className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold bg-white/10 border border-white/30 backdrop-blur-sm">
          <span className="text-blue-200 text-xs">Total Quotation</span>
          <span className="text-white font-bold text-base">{loading ? "…" : filteredQuotations.length}</span>
          {filteredQuotations.length > 0 && (
            <>
              <span className="text-white/30">|</span>
              <span className="text-green-300 font-bold">{fmt(totalGrand)}</span>
            </>
          )}
        </div>
        {/* Create New */}
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold bg-green-600 hover:bg-green-700 active:scale-95 transition-all shadow-md">
          <span className="text-base leading-none">+</span> Create New
        </button>
        {loggedRole === "admin" && (
          <button
            type="button"
            onClick={() => setShowItemNames(true)}
            className="flex items-center gap-2 rounded-lg border border-cyan-300/40 bg-cyan-500/30 px-5 py-2 text-sm font-semibold text-white shadow-md transition-all hover:bg-cyan-500/50 active:scale-95"
          >
            Item Names
          </button>
        )}
        {/* Edit last */}
        <button onClick={() => {
          if (quotations.length > 0) setEditQuotation(quotations[quotations.length - 1]);
          else setShowCreate(true);
        }}
          className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold bg-blue-600 hover:bg-blue-700 active:scale-95 transition-all shadow-md">
          <span>✏️</span> Edit
        </button>
        <button
          type="button"
          onClick={() => refresh()}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-white/10 hover:bg-white/20 border border-white/20 active:scale-95 transition-all disabled:opacity-50"
          title="Refresh quotations"
        >
          <span className={loading ? "animate-spin" : ""}>↻</span> Refresh
        </button>
        <div className="relative min-w-[280px] w-full max-w-sm">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-200/70" aria-hidden="true">⌕</span>
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search user, quotation no. or party name…"
            className="w-full rounded-lg border border-white/20 bg-white/10 py-2 pl-8 pr-8 text-xs text-white placeholder:text-blue-100/50 focus:border-blue-300 focus:outline-none focus:ring-1 focus:ring-blue-300"
            aria-label="Search by user name, quotation number, or party name"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/50 hover:text-white"
              aria-label="Clear quotation search"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* ── ROW 3: Quotations table ── */}
      <div className="pb-4 pt-2">
        <div className="flex flex-wrap items-center justify-end gap-2 px-1 pb-2">
          <span className="whitespace-nowrap text-[10px] text-blue-100/70">
            {filteredQuotations.length} found
          </span>
          <button
            type="button"
            onClick={exportDisplayedCSV}
            disabled={loading || visibleQuotations.length === 0}
            className="flex items-center gap-1.5 rounded-lg border border-emerald-400/30 bg-emerald-500/20 px-3 py-1.5 text-[10px] font-bold text-emerald-200 transition-all hover:bg-emerald-500/40 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
            title={`Export the ${visibleQuotations.length} quotations currently displayed`}
          >
            📥 CSV ({visibleQuotations.length})
          </button>
        </div>

        {loading ? (
          <div className="text-center text-blue-200 text-sm py-4 animate-pulse">Loading quotations…</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-white/10 text-blue-100 text-[11px]">
                <th className="border border-white/15 px-3 py-2 text-center w-10">No.</th>
                <th className="border border-white/15 px-3 py-2 text-left">Quotation No.</th>
                <th className="border border-white/15 px-3 py-2 text-left">Date</th>
                <th className="border border-white/15 px-3 py-2 text-left">Party Name</th>
                <th className="border border-white/15 px-3 py-2 text-left">Address</th>
                <th className="border border-white/15 px-3 py-2 text-right">Grand Total</th>
                <th className="border border-white/15 px-3 py-2 text-left">User</th>
                <th className="border border-white/15 px-3 py-2 text-center" style={{ width: 260 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleQuotations.map((q) => (
                <tr key={q.dbId}
                  className="hover:bg-white/5 transition-colors cursor-pointer"
                  onClick={() => setViewQuotation(q)}>
                  <td className="border border-white/10 px-3 py-2 text-center text-white font-bold">{q.serialNo}</td>
                  <td className="border border-white/10 px-3 py-2 text-blue-100 font-mono text-[10px]">{q.quotationNo || "—"}</td>
                  <td className="border border-white/10 px-3 py-2 text-white/80">{fmtDate(q.date)}</td>
                  <td className="border border-white/10 px-3 py-2 text-white font-semibold">{q.partyName}</td>
                  <td className="border border-white/10 px-3 py-2 text-white/60 max-w-[160px] truncate">{q.partyAddress || "—"}</td>
                  <td className="border border-white/10 px-3 py-2 text-right text-green-300 font-bold font-mono">
                    ₹{q.grandTotal.toLocaleString("en-IN")}
                  </td>
                  <td
                    className="relative border border-white/10 px-3 py-2 whitespace-nowrap"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={() => setHistoryFor((current) => current === q.dbId ? null : q.dbId)}
                      className="font-semibold text-blue-100 hover:text-white hover:underline"
                      title="View compact step-by-step edit history"
                      aria-expanded={historyFor === q.dbId}
                      aria-controls={`quotation-history-${q.dbId}`}
                    >
                      <span className="mr-1" aria-hidden="true">👤</span>
                      {q.editedBy || q.createdBy || "Unknown"} ({q.editCount})
                    </button>
                    {historyFor === q.dbId && (
                      <div
                        className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-sm"
                        onClick={() => setHistoryFor(null)}
                      >
                        <section
                          id={`quotation-history-${q.dbId}`}
                          role="dialog"
                          aria-modal="true"
                          aria-labelledby={`quotation-history-title-${q.dbId}`}
                          onClick={(event) => event.stopPropagation()}
                          className="flex max-h-[82dvh] w-full max-w-xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white text-left text-slate-700 shadow-2xl"
                        >
                          <div className="flex flex-shrink-0 items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
                            <div className="min-w-0">
                              <h3 id={`quotation-history-title-${q.dbId}`} className="truncate text-sm font-bold text-slate-800">
                                Edit History · {q.quotationNo || `Quotation ${q.serialNo}`}
                              </h3>
                              <p className="text-[11px] text-slate-500">{q.editCount} recorded {q.editCount === 1 ? "step" : "steps"} · oldest to newest</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => setHistoryFor(null)}
                              className="rounded-md px-2 py-1 text-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
                              aria-label="Close edit history"
                            >
                              ✕
                            </button>
                          </div>

                          <div className="min-h-0 flex-1 overflow-y-auto p-3">
                            {q.editCount === 0 ? (
                              <p className="rounded-lg bg-slate-50 px-3 py-4 text-center text-xs text-slate-500">No edits recorded.</p>
                            ) : (
                              <ol className="space-y-2">
                                {q.editCount > q.editHistory.length && (
                                  <li className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-2">
                                    <p className="text-[11px] font-bold text-slate-600">
                                      {q.editCount - q.editHistory.length === 1
                                        ? "Step 1"
                                        : `Steps 1–${q.editCount - q.editHistory.length}`}
                                    </p>
                                    <p className="text-[11px] italic text-slate-400">Editor and change details were not stored for these earlier edits.</p>
                                  </li>
                                )}
                                {q.editHistory.map((entry, index) => {
                                  const legacyStepCount = Math.max(0, q.editCount - q.editHistory.length);
                                  const actualChanges = entry.changes.filter((change) => change.from !== change.to);
                                  return (
                                    <li key={`${entry.editedAt || "unknown-time"}-${index}`} className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm">
                                      <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-1 border-b border-slate-100 pb-1.5">
                                        <p className="text-[11px] font-bold text-slate-800">
                                          Step {legacyStepCount + index + 1} · <span className="text-blue-700">{entry.name}</span>
                                        </p>
                                        <time className="text-[10px] text-slate-400" dateTime={entry.editedAt || undefined}>{fmtWhen(entry.editedAt)}</time>
                                      </div>
                                      {actualChanges.length === 0 ? (
                                        <p className="text-[10px] italic text-slate-400">Change details were not recorded for this step.</p>
                                      ) : (
                                        <ul className="divide-y divide-slate-100">
                                          {actualChanges.map((change, changeIndex) => (
                                            <li key={`${change.field}-${changeIndex}`} className="grid gap-x-2 py-1 text-[11px] leading-4 sm:grid-cols-[minmax(110px,0.8fr)_minmax(0,2fr)]">
                                              <span className="font-semibold text-slate-600">{change.field}</span>
                                              <span className="min-w-0 break-words">
                                                <span className="text-red-600">{change.from}</span>
                                                <span className="mx-1.5 text-slate-400">→</span>
                                                <span className="text-emerald-700">{change.to}</span>
                                              </span>
                                            </li>
                                          ))}
                                        </ul>
                                      )}
                                    </li>
                                  );
                                })}
                              </ol>
                            )}
                          </div>
                        </section>
                      </div>
                    )}
                  </td>
                  <td className="border border-white/10 px-2 py-2 text-center"
                    onClick={(event) => event.stopPropagation()}>
                    <div className="flex items-center justify-center gap-1.5">
                      <button onClick={() => setViewQuotation(q)}
                        className="px-2 py-0.5 rounded bg-emerald-500/40 hover:bg-emerald-500/70 text-white text-[10px] font-bold transition-all">
                        👁 View
                      </button>
                      <button
                        type="button"
                        onClick={() => handlePrint(q)}
                        disabled={printingId !== null}
                        className="px-2 py-0.5 rounded bg-amber-500/40 hover:bg-amber-500/70 text-white text-[10px] font-bold transition-all disabled:cursor-wait disabled:opacity-50"
                        title="Print this quotation"
                      >
                        {printingId === q.dbId ? "Preparing…" : "🖨 Print"}
                      </button>
                      <button onClick={() => setEditQuotation(q)}
                        className="px-2 py-0.5 rounded bg-blue-500/40 hover:bg-blue-500/70 text-white text-[10px] font-bold transition-all">
                        ✏️ Edit
                      </button>
                      <button onClick={() => { setEditQuotation({...q, dbId: "", serialNo: 0, quotationNo: ""}); }}
                        className="px-2 py-0.5 rounded bg-purple-500/40 hover:bg-purple-500/70 text-white text-[10px] font-bold transition-all"
                        title="Duplicate this quotation">
                        📋 Copy
                      </button>
                      {loggedRole === "admin" && (
                        <button onClick={() => handleDelete(q.dbId)}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                            confirmDelete === q.dbId
                              ? "bg-red-600 text-white animate-pulse"
                              : "bg-red-500/30 hover:bg-red-500/60 text-red-200"
                          }`}>
                          {confirmDelete === q.dbId ? "Confirm?" : "🗑 Del"}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}

              {visibleQuotations.length === 0 && (
                <tr>
                  <td colSpan={8} className="border border-white/10 px-3 py-6 text-center text-blue-100/60">
                    No quotations match the current search and date filters.
                  </td>
                </tr>
              )}
            </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 px-1 pt-2 text-[10px] text-blue-100/70">
              <span>
                Showing <strong className="text-white">{firstShown}–{lastShown}</strong> of{" "}
                <strong className="text-white">{filteredQuotations.length}</strong> quotations
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={effectivePage <= 1}
                  className="rounded border border-white/20 bg-white/10 px-3 py-1 font-bold text-white transition-colors hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-35"
                >
                  ← Previous
                </button>
                <span className="min-w-[72px] text-center text-blue-100">
                  Page <strong className="text-white">{effectivePage}</strong> of{" "}
                  <strong className="text-white">{totalPages}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                  disabled={effectivePage >= totalPages}
                  className="rounded border border-white/20 bg-white/10 px-3 py-1 font-bold text-white transition-colors hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-35"
                >
                  Next →
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Modals ── */}
      {showCreate     && <QuotationModal onClose={() => setShowCreate(false)} />}
      {showItemNames  && <ItemNameManager onClose={() => setShowItemNames(false)} />}
      {editQuotation  && <QuotationModal onClose={() => setEditQuotation(null)} initialData={editQuotation} />}
      {viewQuotation  && (
        <QuotationViewModal
          quotation={viewQuotation}
          onClose={() => setViewQuotation(null)}
          onEdit={(q) => { setViewQuotation(null); setEditQuotation(q); }}
        />
      )}
    </>
  );
}
