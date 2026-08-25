"use client";

import { useEffect, useState, useRef } from "react";
import dynamic from "next/dynamic";
import { useQuotations, SavedQuotation } from "@/context/QuotationContext";
import { useAuth } from "@/context/AuthContext";

const QuotationModal     = dynamic(() => import("@/components/QuotationModal"),     { ssr: false });
const QuotationViewModal = dynamic(() => import("@/components/QuotationViewModal"), { ssr: false });
const ItemNameManager    = dynamic(() => import("@/components/ItemNameManager"),    { ssr: false });
const RequesterManager   = dynamic(() => import("@/components/RequesterManager"),   { ssr: false });

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
    saveQuotation,
    refresh,
    loading,
    dateFrom,
    dateTo,
    setDateFrom,
    setDateTo,
  } = useQuotations();
  const [showCreate,       setShowCreate]       = useState(false);
  const [showItemNames,    setShowItemNames]    = useState(false);
  const [showRequesters,   setShowRequesters]   = useState(false);
  const [editQuotation, setEditQuotation] = useState<SavedQuotation | null>(null);
  const [viewQuotation, setViewQuotation] = useState<SavedQuotation | null>(null);
  const [pageSize]       = useState<PageSize>(DEFAULT_PAGE_SIZE);
  const [page,           setPage]           = useState(1);
  const [historyFor,     setHistoryFor]     = useState<string | null>(null);
  const [printingId,     setPrintingId]     = useState<string | null>(null);

  const totalGrand = filteredQuotations.reduce((sum, quotation) => sum + quotation.grandTotal, 0);
  const fmt = (n: number) => "₹" + n.toLocaleString("en-IN");

  // Import template state
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState("");
  const importFileRef = useRef<HTMLInputElement>(null);
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
    const q = quotations.find((x) => x.dbId === dbId);
    const label = q ? `${q.quotationNo} — ${q.partyName}` : dbId;
    const confirmed = window.confirm(`Are you sure you want to delete this quotation?\n\n${label}\n\nThis action cannot be undone.`);
    if (!confirmed) return;

    try {
      await deleteQuotation(dbId);
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
      quotation.createdBy || "Unknown",
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

  // ── Import / Export Template ────────────────────────────────────────────────
  async function handleExportTemplate() {
    const { exportTemplate } = await import("@/lib/quotationTemplate");
    await exportTemplate();
  }

  function generateNextQuotationNo(fullName: string): string {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    const fyStartYear = currentMonth >= 4 ? currentYear : currentYear - 1;
    const year = fyStartYear % 100;
    const nextYear = (fyStartYear + 1) % 100;
    const fyPrefix = `PS/${year}-${nextYear}/QT-`;
    let maxNum = 0;
    for (const q of quotations) {
      const qNo = q.quotationNo || "";
      if (qNo.startsWith(fyPrefix)) {
        const match = qNo.slice(fyPrefix.length).trim().match(/^(\d+)/);
        if (match) { const n = parseInt(match[1], 10); if (n > maxNum) maxNum = n; }
      }
    }
    const floor = fyStartYear === 2026 ? 553 : 0;
    const num = String(Math.max(maxNum, floor) + 1).padStart(4, "0");
    const parts = fullName.trim().split(/\s+/).filter(Boolean);
    const initials = parts.length === 0 ? "" : parts.length === 1 ? parts[0][0].toUpperCase() : (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return `PS/${year}-${nextYear}/QT-${num}${initials ? " " + initials : ""}`;
  }

  async function handleImport() {
    if (!importFile) { setImportError("Please select a file"); return; }
    setImportLoading(true);
    setImportError("");
    try {
      const { importTemplate } = await import("@/lib/quotationTemplate");
      const result = await importTemplate(importFile);
      const today = new Date().toISOString().split("T")[0];
      const finalUser = result.userName || "Unknown";
      const finalPartyName = result.partyName || "Unknown";
      const qNo = generateNextQuotationNo(finalUser);
      const discount = result.discounts.seasonal.amount + result.discounts.special.amount;

      await saveQuotation({
        quotationNo: qNo,
        date: today,
        partyName: finalPartyName,
        partyAddress: result.partyAddress || "",
        partyGST: result.partyGST || "",
        subject: result.subject || "",
        attention: result.attention || "",
        requester: result.requester || "",
        rows: result.rows,
        gross: result.gross,
        discount,
        discounts: result.discounts,
        afterDiscount: result.afterDiscount,
        gst: result.gst,
        grandTotal: result.grandTotal,
      }, finalUser);

      setShowImportModal(false);
      setImportFile(null);
      alert(`Quotation imported! No: ${qNo}`);
    } catch (e) {
      setImportError(e instanceof Error ? e.message : "Import failed");
    } finally {
      setImportLoading(false);
    }
  }

  return (
    <>
      {/* ── ROW 2: Action buttons ── */}
      <div className="flex flex-wrap items-center justify-center gap-3 py-3 border-b border-slate-200">
        {/* Total */}
        <div className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold bg-slate-100 border border-slate-200">
          <span className="text-slate-500 text-xs">Total Quotation</span>
          <span className="text-slate-800 font-bold text-base">{loading ? "…" : filteredQuotations.length}</span>
          {filteredQuotations.length > 0 && (
            <>
              <span className="text-slate-300">|</span>
              <span className="text-green-600 font-bold">{fmt(totalGrand)}</span>
            </>
          )}
        </div>
        {/* Create New */}
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold text-white bg-green-600 hover:bg-green-700 active:scale-95 transition-all shadow-md">
          <span className="text-base leading-none">+</span> Create New
        </button>
        {loggedRole === "admin" && (
          <button
            type="button"
            onClick={() => setShowItemNames(true)}
            className="flex items-center gap-2 rounded-lg border border-cyan-400 bg-cyan-50 px-5 py-2 text-sm font-semibold text-cyan-700 shadow-sm transition-all hover:bg-cyan-100 active:scale-95"
          >
            Item Names
          </button>
        )}
        {loggedRole === "admin" && (
          <button
            type="button"
            onClick={() => setShowRequesters(true)}
            className="flex items-center gap-2 rounded-lg border border-violet-400 bg-violet-50 px-5 py-2 text-sm font-semibold text-violet-700 shadow-sm transition-all hover:bg-violet-100 active:scale-95"
          >
            Requester
          </button>
        )}
        {/* Refresh + Search on same line */}
        <button
          type="button"
          onClick={() => refresh()}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 active:scale-95 transition-all disabled:opacity-50 flex-shrink-0"
          title="Refresh quotations"
        >
          <span className={loading ? "animate-spin inline-block" : "inline-block"}>↻</span> Refresh
        </button>
        <div className="relative min-w-[280px] w-full max-w-sm">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true">⌕</span>
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search user, quotation no. or party name…"
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-8 pr-8 text-xs text-slate-800 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-300"
            aria-label="Search by user name, quotation number, or party name"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
              aria-label="Clear quotation search"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* ── ROW 3: Quotations table ── */}
      <div className="pb-4 pt-2">
        <div className="flex flex-wrap items-center justify-between gap-2 px-1 pb-2">
          {/* Left: Date filter */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Filter:</span>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
              className="bg-white border border-slate-200 rounded px-2 py-1 text-[10px] text-slate-700 focus:outline-none focus:border-blue-400 w-[105px]" title="From date" />
            <span className="text-slate-400 text-[10px]">→</span>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
              className="bg-white border border-slate-200 rounded px-2 py-1 text-[10px] text-slate-700 focus:outline-none focus:border-blue-400 w-[105px]" title="To date" />
            {(dateFrom || dateTo) && (
              <button type="button" onClick={() => { setDateFrom(""); setDateTo(""); }}
                className="text-[10px] text-red-500 hover:text-red-700 font-bold" aria-label="Clear date filter">✕</button>
            )}
          </div>
          {/* Right: Import/Export + CSV */}
          <div className="flex items-center gap-2">
            <span className="whitespace-nowrap text-[10px] text-slate-500">{filteredQuotations.length} found</span>
            <button type="button" onClick={handleExportTemplate}
              className="flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[10px] font-bold text-emerald-700 transition-all hover:bg-emerald-100 active:scale-95"
              title="Download blank quotation template">↓ Export Template</button>
            <button type="button" onClick={() => { setImportFile(null); setImportError(""); setShowImportModal(true); }}
              className="flex items-center gap-1 rounded-lg border border-violet-200 bg-violet-50 px-3 py-1.5 text-[10px] font-bold text-violet-700 transition-all hover:bg-violet-100 active:scale-95"
              title="Import filled template as quotation">↑ Import Template</button>
            <button type="button" onClick={exportDisplayedCSV}
              disabled={loading || visibleQuotations.length === 0}
              className="flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[10px] font-bold text-emerald-700 transition-all hover:bg-emerald-100 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
              title={`Export the ${visibleQuotations.length} quotations currently displayed`}>
              📥 CSV ({visibleQuotations.length})
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center text-slate-400 text-sm py-4 animate-pulse">Loading quotations…</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600 text-[11px]">
                <th className="border border-slate-200 px-3 py-2 text-center w-10">No.</th>
                <th className="border border-slate-200 px-3 py-2 text-left">Quotation No.</th>
                <th className="border border-slate-200 px-3 py-2 text-left">Date</th>
                <th className="border border-slate-200 px-3 py-2 text-left">Party Name</th>
                <th className="border border-slate-200 px-3 py-2 text-left">Address</th>
                <th className="border border-slate-200 px-3 py-2 text-right">Grand Total</th>
                <th className="border border-slate-200 px-3 py-2 text-left">User</th>
                <th className="border border-slate-200 px-3 py-2 text-center" style={{ width: 260 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleQuotations.map((q, index) => (
                <tr key={q.dbId}
                  className="hover:bg-slate-50 transition-colors cursor-pointer"
                  onClick={() => setViewQuotation(q)}>
                  <td className="border border-slate-200 px-3 py-2 text-center text-slate-800 font-bold">{filteredQuotations.length - startIndex - index}</td>
                  <td className="border border-slate-200 px-3 py-2 text-slate-600 font-mono text-[10px]">{q.quotationNo || "—"}</td>
                  <td className="border border-slate-200 px-3 py-2 text-slate-600">{fmtDate(q.date)}</td>
                  <td className="border border-slate-200 px-3 py-2 text-slate-800 font-semibold">{q.partyName}</td>
                  <td className="border border-slate-200 px-3 py-2 text-slate-500 max-w-[160px] truncate">{q.partyAddress || "—"}</td>
                  <td className="border border-slate-200 px-3 py-2 text-right text-green-600 font-bold font-mono">
                    ₹{q.grandTotal.toLocaleString("en-IN")}
                  </td>
                  <td
                    className="relative border border-slate-200 px-3 py-2 whitespace-nowrap"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={() => setHistoryFor((current) => current === q.dbId ? null : q.dbId)}
                      className="font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                      title="View compact step-by-step edit history"
                      aria-expanded={historyFor === q.dbId}
                      aria-controls={`quotation-history-${q.dbId}`}
                    >
                      <span className="mr-1" aria-hidden="true">👤</span>
                      {q.createdBy || "Unknown"} ({q.editCount})
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
                  <td className="border border-slate-200 px-2 py-2 text-center"
                    onClick={(event) => event.stopPropagation()}>
                    <div className="flex items-center justify-center gap-1.5">
                      <button onClick={() => setViewQuotation(q)}
                        className="px-2 py-0.5 rounded bg-emerald-100 hover:bg-emerald-200 text-emerald-700 text-[10px] font-bold transition-all">
                        👁 View
                      </button>
                      <button
                        type="button"
                        onClick={() => handlePrint(q)}
                        disabled={printingId !== null}
                        className="px-2 py-0.5 rounded bg-amber-100 hover:bg-amber-200 text-amber-700 text-[10px] font-bold transition-all disabled:cursor-wait disabled:opacity-50"
                        title="Print this quotation"
                      >
                        {printingId === q.dbId ? "Preparing…" : "🖨 Print"}
                      </button>
                      <button onClick={() => setEditQuotation(q)}
                        className="px-2 py-0.5 rounded bg-blue-100 hover:bg-blue-200 text-blue-700 text-[10px] font-bold transition-all">
                        ✏️ Edit
                      </button>
                      <button onClick={() => { setEditQuotation({...q, dbId: "", serialNo: 0, quotationNo: ""}); }}
                        className="px-2 py-0.5 rounded bg-purple-100 hover:bg-purple-200 text-purple-700 text-[10px] font-bold transition-all"
                        title="Duplicate this quotation">
                        📋 Copy
                      </button>
                      {loggedRole === "admin" && (
                        <button onClick={() => handleDelete(q.dbId)}
                          className="px-2 py-0.5 rounded text-[10px] font-bold transition-all bg-red-100 hover:bg-red-200 text-red-700">
                          Del
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}

              {visibleQuotations.length === 0 && (
                <tr>
                  <td colSpan={8} className="border border-slate-200 px-3 py-6 text-center text-slate-400">
                    No quotations match the current search and date filters.
                  </td>
                </tr>
              )}
            </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 px-1 pt-2 text-[10px] text-slate-500">
              <span>
                Showing <strong className="text-slate-800">{firstShown}–{lastShown}</strong> of{" "}
                <strong className="text-slate-800">{filteredQuotations.length}</strong> quotations
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={effectivePage <= 1}
                  className="rounded border border-slate-200 bg-white px-3 py-1 font-bold text-slate-700 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-35"
                >
                  ← Previous
                </button>
                <span className="min-w-[72px] text-center text-slate-600">
                  Page <strong className="text-slate-800">{effectivePage}</strong> of{" "}
                  <strong className="text-slate-800">{totalPages}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                  disabled={effectivePage >= totalPages}
                  className="rounded border border-slate-200 bg-white px-3 py-1 font-bold text-slate-700 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-35"
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
      {showRequesters && <RequesterManager onClose={() => setShowRequesters(false)} />}
      {editQuotation  && <QuotationModal onClose={() => setEditQuotation(null)} initialData={editQuotation} />}
      {viewQuotation  && (
        <QuotationViewModal
          quotation={viewQuotation}
          onClose={() => setViewQuotation(null)}
          onEdit={(q) => { setViewQuotation(null); setEditQuotation(q); }}
        />
      )}

      {/* Import Template Modal — just file picker */}
      {showImportModal && (
        <>
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" onClick={() => setShowImportModal(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-800">Import Quotation</h3>
                <button type="button" onClick={() => setShowImportModal(false)} className="text-slate-400 hover:text-slate-700 text-lg">✕</button>
              </div>
              {importError && <p className="text-red-600 text-xs bg-red-50 border border-red-200 rounded px-3 py-2">{importError}</p>}
              <p className="text-xs text-slate-500">Select a filled template. User name, client, address, subject, discounts sab template se read honge.</p>
              <input ref={importFileRef} type="file" accept=".xlsx,.xls"
                onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                className="w-full text-xs text-slate-700 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100" />
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowImportModal(false)} className="px-4 py-2 rounded-lg border border-slate-300 text-slate-600 text-sm hover:bg-slate-50">Cancel</button>
                <button type="button" onClick={handleImport} disabled={importLoading}
                  className="px-5 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold shadow transition-all active:scale-95 disabled:opacity-50">
                  {importLoading ? "Importing..." : "Import & Save"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
