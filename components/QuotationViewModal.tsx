"use client";

import { useEffect } from "react";
import { SavedQuotation } from "@/context/QuotationContext";
import dynamic from "next/dynamic";

const QuotationDownload = dynamic(() => import("@/components/QuotationDownload"), { ssr: false });

type Props = {
  quotation: SavedQuotation;
  onClose:   () => void;
  onEdit:    (q: SavedQuotation) => void;
};

const SECTION_LABELS: Record<string, string> = {
  "Display Counter":     "GROUND FLOOR — DISPLAY COUNTER",
  "Back Counter":        "BACK COUNTER (DISPLAY SECTION)",
  "Mithai Coordination": "MITHAI COORDINATION - ROOM",
  "Service Counter":     "SERVICE COUNTER",
  "Main Kitchen":        "MAIN KITCHEN",
  "Cold Room":           "COLD ROOM",
  "Dish Wash":           "DISH WASH SECTION",
  "Exhaust Hood":        "EXHAUST HOOD",
  "Custom":              "ITEMS",
};

function fmt(n: number | null): string {
  if (n === null) return "NQ";
  return n.toLocaleString("en-IN");
}

export default function QuotationViewModal({ quotation: q, onClose, onEdit }: Props) {
  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [onClose]);

  // Group rows by section
  const sections = Array.from(new Set(q.rows.map((r) => r.section)));

  // Download props
  const downloadRows = q.rows.map((r, i) => ({
    slNo:     String(i + 1),
    itemCode: r.id,
    desc:     r.desc,
    size:     r.size,
    hsn:      r.hsn,
    qty:      String(r.qty),
    discount: "0",
    rate:     r.rate !== null ? String(r.rate) : "",
    amt:      r.amt,
  }));

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" onClick={onClose} />
      <div role="dialog" aria-modal="true"
        className="fixed inset-2 sm:inset-3 z-50 flex flex-col bg-white rounded-2xl shadow-2xl overflow-hidden">

        {/* ── TOP BAR ── */}
        <div className="flex items-center justify-between px-6 py-3 flex-shrink-0"
          style={{ background: "linear-gradient(135deg,#1e3a5f,#2563eb)" }}>
          <div>
            <h2 className="text-white font-bold text-base">
              👁 Quotation #{q.serialNo} — {q.partyName}
            </h2>
            <p className="text-blue-200 text-xs">{q.quotationNo} · {q.date}</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Download */}
            <QuotationDownload
              quotation={q}
              partyName={q.partyName}
              quotationNo={q.quotationNo}
              date={q.date}
              subject={q.subject}
              rows={downloadRows}
              gross={q.gross}
              discount={q.discount}
              afterDiscount={q.afterDiscount}
              gst={q.gst}
              grandTotal={q.grandTotal}
            />
            {/* Edit */}
            <button onClick={() => onEdit(q)}
              className="px-4 py-1.5 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-sm font-bold transition-all active:scale-95">
              ✏️ Edit
            </button>
            <button onClick={onClose} className="text-white/70 hover:text-white text-xl leading-none">✕</button>
          </div>
        </div>

        {/* ── BODY ── */}
        <div className="flex-1 overflow-y-auto bg-gray-50">
          <div className="max-w-5xl mx-auto p-4 space-y-4">

            {/* Quotation Document */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">

              {/* Company header */}
              <div className="bg-slate-800 text-white text-center py-3">
                <p className="font-bold text-base tracking-wide">PRESTAIR SYSTEMS LLP</p>
                <p className="text-slate-300 text-xs">B-127 Phase-2, Noida, UP 201305 | GST: 09AATFP8342B1ZX</p>
              </div>

              {/* Party + Meta */}
              <div className="grid grid-cols-2 divide-x divide-slate-200 border-b border-slate-200">
                <div className="p-4 space-y-2 text-sm">
                  <InfoRow label="M/S" value={q.partyName} bold />
                  <InfoRow label="Address" value={q.partyAddress || "—"} />
                  <InfoRow label="GST No." value={q.partyGST || "—"} />
                </div>
                <div className="p-4 space-y-2 text-sm">
                  <InfoRow label="Date" value={q.date} />
                  <InfoRow label="Quotation No." value={q.quotationNo || "—"} mono />
                  <InfoRow label="Kind Attention" value={q.attention || "—"} />
                </div>
              </div>

              {/* Subject */}
              <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 text-xs text-slate-700 font-semibold">
                <span className="text-slate-400 font-normal">Subject: </span>{q.subject}
              </div>

              {/* Items Table */}
              {q.rows.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse" style={{ fontSize: "11px" }}>
                    <thead>
                      <tr className="bg-slate-700 text-white">
                        <th className="border border-slate-600 px-2 py-2 text-center w-10">SL</th>
                        <th className="border border-slate-600 px-2 py-2 text-left w-20">CODE</th>
                        <th className="border border-slate-600 px-3 py-2 text-left">DESCRIPTION</th>
                        <th className="border border-slate-600 px-2 py-2 text-center w-24">SIZE</th>
                        <th className="border border-slate-600 px-2 py-2 text-center w-16">HSN</th>
                        <th className="border border-slate-600 px-2 py-2 text-center w-12">QTY</th>
                        <th className="border border-slate-600 px-2 py-2 text-right w-24">RATE (₹)</th>
                        <th className="border border-slate-600 px-2 py-2 text-right w-28">AMOUNT (₹)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sections.map((section) => {
                        const sRows = q.rows.filter((r) => r.section === section);
                        if (!sRows.length) return null;
                        return [
                          <tr key={`sec-${section}`}>
                            <td colSpan={8} className="border border-slate-100 px-3 py-1.5 bg-blue-50 text-blue-800 font-bold text-[10px] uppercase tracking-wider">
                              {SECTION_LABELS[section] ?? section}
                            </td>
                          </tr>,
                          ...sRows.map((r, idx) => (
                            <tr key={r.id + idx} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                              <td className="border border-slate-100 px-2 py-1.5 text-center text-slate-500">{idx + 1}</td>
                              <td className="border border-slate-100 px-2 py-1.5 font-mono font-bold text-slate-700">{r.id}</td>
                              <td className="border border-slate-100 px-3 py-1.5 text-slate-700">{r.desc}</td>
                              <td className="border border-slate-100 px-2 py-1.5 text-center text-slate-500 text-[10px]">{r.size}</td>
                              <td className="border border-slate-100 px-2 py-1.5 text-center font-mono text-slate-600">{r.hsn}</td>
                              <td className="border border-slate-100 px-2 py-1.5 text-center font-semibold text-slate-700">{r.qty}</td>
                              <td className="border border-slate-100 px-2 py-1.5 text-right font-mono text-slate-700">
                                {r.rate !== null ? fmt(r.rate) : <span className="text-slate-400">NQ</span>}
                              </td>
                              <td className="border border-slate-100 px-3 py-1.5 text-right font-mono font-bold">
                                {r.amt !== null
                                  ? <span className="text-green-700">{fmt(r.amt)}</span>
                                  : <span className="text-slate-400 font-normal">NQ</span>}
                              </td>
                            </tr>
                          )),
                        ];
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-8 text-center text-slate-400 text-sm">No items in this quotation</div>
              )}

              {/* Totals */}
              <div className="border-t-2 border-slate-300">
                {([
                  ["TOTAL (GROSS)",       q.gross,         "bg-yellow-50  text-yellow-900 font-bold"],
                  ["LESS – DISCOUNT",     q.discount,      "bg-orange-50  text-orange-700"],
                  ["TOTAL AFTER DISC.",   q.afterDiscount, "bg-orange-100 text-orange-900 font-bold"],
                  ["GST @ 18%",           q.gst,           "bg-red-50     text-red-700"],
                  ["GRAND TOTAL",         q.grandTotal,    "bg-green-600  text-white font-bold text-sm"],
                ] as [string, number, string][]).map(([label, val, cls]) => (
                  <div key={label} className={`flex justify-between items-center px-6 py-2 border-b border-slate-200 ${cls}`}>
                    <span className="tracking-wide text-xs font-semibold">{label}</span>
                    <span className="font-mono font-bold">₹ {fmt(val)}</span>
                  </div>
                ))}
                <div className="px-6 py-2 text-[10px] text-slate-400 italic bg-slate-50">
                  TRANSPORTATION CHARGES AS ACTUAL
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="flex-shrink-0 bg-white border-t border-slate-200 px-6 py-3 flex justify-between items-center">
          <p className="text-xs text-slate-500">
            <strong>{q.rows.length}</strong> items &nbsp;·&nbsp; Grand Total:{" "}
            <strong className="text-green-700 text-sm">₹ {fmt(q.grandTotal)}</strong>
          </p>
          <div className="flex gap-3">
            <button onClick={onClose}
              className="px-5 py-2 rounded-lg border border-slate-200 text-slate-600 text-sm hover:bg-slate-50 transition-colors">
              Close
            </button>
            <button onClick={() => onEdit(q)}
              className="px-6 py-2 rounded-lg text-white text-sm font-bold shadow hover:brightness-110 active:scale-95 transition-all"
              style={{ background: "linear-gradient(135deg,#1e3a5f,#2563eb)" }}>
              ✏️ Edit This Quotation
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function InfoRow({ label, value, bold, mono }: { label: string; value: string; bold?: boolean; mono?: boolean }) {
  return (
    <div className="flex gap-2">
      <span className="text-slate-400 text-xs min-w-[80px] flex-shrink-0">{label}:</span>
      <span className={`text-xs text-slate-800 ${bold ? "font-bold" : ""} ${mono ? "font-mono" : ""}`}>
        {value}
      </span>
    </div>
  );
}
