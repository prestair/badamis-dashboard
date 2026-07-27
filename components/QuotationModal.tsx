"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuotations, SavedQuotation, SavedRowState } from "@/context/QuotationContext";
import dynamic from "next/dynamic";

const QuotationDownload = dynamic(() => import("@/components/QuotationDownload"), { ssr: false });

const today = new Date().toISOString().split("T")[0];

// ── Types ──────────────────────────────────────────────────────────────────────
type ItemRow = {
  uid:      string; // unique key for React
  slNo:     string;
  itemCode: string;
  desc:     string;
  size:     string;
  hsn:      string;
  qty:      string;
  discount: string;
  rate:     string;
};

type Props = { onClose: () => void; initialData?: SavedQuotation | null };

let uidCounter = 1;
function newUid() { return `row-${uidCounter++}`; }

function blankRow(slNo: number): ItemRow {
  return { uid: newUid(), slNo: String(slNo), itemCode: "", desc: "", size: "", hsn: "", qty: "", discount: "0", rate: "" };
}

function initItemRows(initial?: SavedQuotation | null): ItemRow[] {
  if (!initial || initial.rows.length === 0) return [blankRow(1)];
  return initial.rows.map((r, i) => ({
    uid:      newUid(),
    slNo:     String(i + 1),
    itemCode: r.id,
    desc:     r.desc,
    size:     r.size,
    hsn:      r.hsn,
    qty:      String(r.qty),
    discount: "0",
    rate:     r.rate !== null ? String(r.rate) : "",
  }));
}

export default function QuotationModal({ onClose, initialData }: Props) {
  const { saveQuotation, updateQuotation } = useQuotations();
  const isEdit = !!initialData;

  // ── Step state ────────────────────────────────────────────────────────────
  const [step, setStep] = useState<1 | 2>(1);

  // ── Step 1: Party / Quotation details ─────────────────────────────────────
  const [date,         setDate]         = useState(initialData?.date         ?? today);
  const [partyName,    setPartyName]    = useState(initialData?.partyName    ?? "");
  const [partyAddress, setPartyAddress] = useState(initialData?.partyAddress ?? "");
  const [partyGST,     setPartyGST]     = useState(initialData?.partyGST    ?? "");
  const [attention,    setAttention]    = useState(initialData?.attention    ?? "");
  const [quotationNo,  setQuotationNo]  = useState(initialData?.quotationNo  ?? "PS/25-26/QT-");
  const [subject,      setSubject]      = useState(
    initialData?.subject ??
    "QUOTATION FOR DISPLAY WITH SERVICES COUNTER & KITCHEN EQUIPMENT - AT BADAMI'S SWEETS-SAYA SOUTH EX NOIDA"
  );
  const [step1Errors, setStep1Errors] = useState<Record<string,string>>({});

  // ── Step 2: Item rows ──────────────────────────────────────────────────────
  const [itemRows, setItemRows] = useState<ItemRow[]>(() => initItemRows(initialData));
  const [overallDiscount, setOverallDiscount] = useState(
    initialData?.discount != null ? String(initialData.discount) : "0"
  );
  const [saved,       setSaved]       = useState(false);
  const [savedSerial, setSavedSerial] = useState<number | null>(null);

  // close on Escape
  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [onClose]);

  // ── Row helpers ────────────────────────────────────────────────────────────
  function updateItemRow(uid: string, field: keyof ItemRow, value: string) {
    setItemRows((prev) =>
      prev.map((r) => (r.uid === uid ? { ...r, [field]: value } : r))
    );
    setSaved(false);
  }

  function addRow() {
    setItemRows((prev) => [...prev, blankRow(prev.length + 1)]);
  }

  function deleteRow(uid: string) {
    setItemRows((prev) => {
      const next = prev.filter((r) => r.uid !== uid);
      return next.map((r, i) => ({ ...r, slNo: String(i + 1) }));
    });
    setSaved(false);
  }

  // ── Per-row amount = qty * rate - row discount ─────────────────────────────
  function rowAmt(row: ItemRow): number | null {
    const qty  = Number(row.qty);
    const rate = Number(row.rate);
    const disc = Number(row.discount) || 0;
    if (!row.qty || !row.rate || isNaN(qty) || isNaN(rate)) return null;
    return Math.max(0, qty * rate - disc);
  }

  // ── Live totals ────────────────────────────────────────────────────────────
  const gross = useMemo(
    () => itemRows.reduce((s, r) => s + (rowAmt(r) ?? 0), 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [itemRows]
  );
  const overallDisc  = Math.max(0, Number(overallDiscount) || 0);
  const afterDiscount = Math.max(0, gross - overallDisc);
  const gst           = Math.round(afterDiscount * 0.18);
  const grandTotal    = afterDiscount + gst;

  const fmt = (n: number) => n.toLocaleString("en-IN");

  // ── Validation Step 1 ─────────────────────────────────────────────────────
  function validateStep1() {
    const e: Record<string,string> = {};
    if (!partyName.trim()) e.partyName = "Required";
    if (!date)             e.date      = "Required";
    return e;
  }

  function goToStep2() {
    const errs = validateStep1();
    if (Object.keys(errs).length) { setStep1Errors(errs); return; }
    setStep1Errors({});
    setStep(2);
  }

  // ── Save ───────────────────────────────────────────────────────────────────
  async function handleSave() {
    const savedRows: SavedRowState[] = itemRows.map((r) => {
      const rate = r.rate === "" ? null : Number(r.rate);
      const qty  = Number(r.qty) || 0;
      const amt  = rowAmt(r);
      return { id: r.itemCode || r.slNo, desc: r.desc, size: r.size, hsn: r.hsn,
               section: "Custom", qty, rate, amt, checked: true };
    });

    const payload = {
      quotationNo, date, partyName, partyAddress, partyGST, subject, attention,
      rows: savedRows, gross, discount: overallDisc, afterDiscount, gst, grandTotal,
    };

    try {
      if (isEdit && initialData) {
        await updateQuotation(initialData.dbId, payload);
        setSavedSerial(initialData.serialNo);
      } else {
        const serial = await saveQuotation(payload);
        setSavedSerial(serial);
      }
      setSaved(true);
      // ── Auto-close after 1.5 seconds — return to dashboard ──
      setTimeout(() => onClose(), 1500);
    } catch (e) {
      console.error("Save failed", e);
      alert("Failed to save. Please try again.");
    }
  }

  const inp = (err?: string) =>
    `border rounded px-2 py-1.5 text-xs w-full focus:outline-none focus:ring-1 bg-white text-slate-800 ${
      err ? "border-red-400 focus:ring-red-300" : "border-slate-300 focus:ring-blue-300"
    }`;

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" onClick={onClose} />
      <div role="dialog" aria-modal="true"
        className="fixed inset-2 sm:inset-3 z-50 flex flex-col bg-white rounded-2xl shadow-2xl overflow-hidden">

        {/* ── TOP BAR ── */}
        <div className="flex items-center justify-between px-6 py-3 flex-shrink-0"
          style={{ background: "linear-gradient(135deg,#1e3a5f,#2563eb)" }}>
          <div className="flex items-center gap-3">
            <div>
              <h2 className="text-white font-bold text-base">
                {isEdit ? `✏️ Edit Quotation #${initialData!.serialNo}` : "➕ Create New Quotation"}
              </h2>
              <p className="text-blue-200 text-xs">Prestair Systems LLP</p>
            </div>
            {/* Step indicator */}
            <div className="flex items-center gap-1.5 ml-4">
              {[1,2].map((s) => (
                <button key={s} onClick={() => s === 1 ? setStep(1) : goToStep2()}
                  className={`w-7 h-7 rounded-full text-xs font-bold transition-all ${
                    step === s ? "bg-white text-blue-700 shadow" : "bg-white/20 text-white/60 hover:bg-white/30"
                  }`}>
                  {s}
                </button>
              ))}
              <span className="text-blue-200 text-xs ml-1">
                {step === 1 ? "Party Details" : "Item Entries"}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {saved && savedSerial && (
              <span className="text-green-300 text-sm font-semibold animate-pulse">
                ✅ {isEdit ? "Updated" : "Saved"} #{savedSerial}! Returning…
              </span>
            )}
            {/* Download buttons — show on step 2 */}
            {step === 2 && (
              <QuotationDownload
                quotation={initialData!}
                partyName={partyName}
                quotationNo={quotationNo}
                date={date}
                subject={subject}
                rows={itemRows.map((r) => ({
                  slNo: r.slNo, itemCode: r.itemCode, desc: r.desc,
                  size: r.size, hsn: r.hsn, qty: r.qty,
                  discount: r.discount, rate: r.rate,
                  amt: rowAmt(r),
                }))}
                gross={gross}
                discount={overallDisc}
                afterDiscount={afterDiscount}
                gst={gst}
                grandTotal={grandTotal}
              />
            )}
            {step === 1 ? (
              <button onClick={goToStep2}
                className="px-4 py-1.5 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-sm font-bold transition-all active:scale-95">
                Next → Items
              </button>
            ) : (
              <>
                <button onClick={() => setStep(1)}
                  className="px-4 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white text-sm font-bold transition-all">
                  ← Back
                </button>
                <button onClick={handleSave}
                  className="px-4 py-1.5 rounded-lg bg-green-500 hover:bg-green-600 text-white text-sm font-bold transition-all active:scale-95">
                  💾 {isEdit ? "Update" : "Save"}
                </button>
              </>
            )}
            <button onClick={onClose} className="text-white/70 hover:text-white text-xl leading-none">✕</button>
          </div>
        </div>

        {/* ── BODY ── */}
        <div className="flex-1 overflow-y-auto bg-gray-50">
          <div className="max-w-5xl mx-auto p-4">

            {/* ════ STEP 1: Party Details ════ */}
            {step === 1 && (
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                {/* Header */}
                <div className="bg-slate-800 text-white text-center py-3">
                  <p className="font-bold text-base">PRESTAIR SYSTEMS LLP</p>
                  <p className="text-slate-300 text-xs">B-127 Phase-2, Noida, UP 201305 | GST: 09AATFP8342B1ZX</p>
                </div>

                <div className="p-6 space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    {/* LEFT */}
                    <div className="space-y-4">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1">
                        Party Details
                      </p>
                      <div>
                        <label className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">M/S (Party Name) *</label>
                        <input value={partyName}
                          onChange={(e) => { setPartyName(e.target.value); setStep1Errors((x) => ({...x,partyName:""})); }}
                          placeholder="BADAMI'S HARVEST PRIVATE LIMITED"
                          className={inp(step1Errors.partyName) + " font-semibold mt-1"} />
                        {step1Errors.partyName && <p className="text-red-500 text-[10px] mt-0.5">{step1Errors.partyName}</p>}
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Address</label>
                        <textarea value={partyAddress}
                          onChange={(e) => setPartyAddress(e.target.value)}
                          placeholder="Village Bisrakh Jalalpur, Noida, Gautam Buddha Nagar, UP – 203207"
                          rows={3} className={inp() + " resize-none mt-1"} />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">GST No.</label>
                        <input value={partyGST} onChange={(e) => setPartyGST(e.target.value)}
                          placeholder="09AANCB2006P1ZD" className={inp() + " mt-1"} />
                      </div>
                    </div>

                    {/* RIGHT */}
                    <div className="space-y-4">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1">
                        Quotation Details
                      </p>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Date *</label>
                          <input type="date" value={date}
                            onChange={(e) => { setDate(e.target.value); setStep1Errors((x) => ({...x,date:""})); }}
                            className={inp(step1Errors.date) + " mt-1"} />
                          {step1Errors.date && <p className="text-red-500 text-[10px] mt-0.5">{step1Errors.date}</p>}
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Quotation No.</label>
                          <input value={quotationNo} onChange={(e) => setQuotationNo(e.target.value)}
                            className={inp() + " mt-1"} />
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Kind Attention</label>
                        <input value={attention} onChange={(e) => setAttention(e.target.value)}
                          placeholder="Mr. Gulshan Bhati" className={inp() + " mt-1"} />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Overall Discount (₹)</label>
                        <div className="relative mt-1">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs">₹</span>
                          <input type="number" min={0} value={overallDiscount}
                            onChange={(e) => setOverallDiscount(e.target.value)}
                            placeholder="0" className={inp() + " pl-5"} />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Subject */}
                  <div>
                    <label className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Subject</label>
                    <input value={subject} onChange={(e) => setSubject(e.target.value)}
                      className={inp() + " mt-1 font-semibold"} />
                  </div>

                  <button onClick={goToStep2}
                    className="w-full py-2.5 rounded-lg text-white font-bold text-sm shadow hover:brightness-110 active:scale-95 transition-all"
                    style={{ background:"linear-gradient(135deg,#1e3a5f,#2563eb)" }}>
                    Next → Add Items
                  </button>
                </div>
              </div>
            )}

            {/* ════ STEP 2: Item Entries ════ */}
            {step === 2 && (
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">

                {/* Header banner */}
                <div className="bg-slate-800 text-white text-center py-2 px-4">
                  <p className="font-bold text-sm">{partyName || "Party Name"}</p>
                  <p className="text-slate-300 text-xs">{quotationNo} &nbsp;|&nbsp; {date}</p>
                </div>

                {/* Subject row */}
                <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 text-xs text-slate-600 font-semibold">
                  <span className="text-slate-400 font-normal">Subject: </span>{subject}
                </div>

                {/* ── Items Table ── */}
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse" style={{ fontSize:"11px" }}>
                    <thead>
                      <tr className="bg-slate-700 text-white">
                        <th className="border border-slate-600 px-2 py-2.5 text-center" style={{width:42}}>SL NO</th>
                        <th className="border border-slate-600 px-2 py-2.5 text-left" style={{width:90}}>ITEM CODE</th>
                        <th className="border border-slate-600 px-3 py-2.5 text-left">DESCRIPTION</th>
                        <th className="border border-slate-600 px-2 py-2.5 text-center" style={{width:100}}>SIZE</th>
                        <th className="border border-slate-600 px-2 py-2.5 text-center" style={{width:80}}>HSN CODE</th>
                        <th className="border border-slate-600 px-2 py-2.5 text-center" style={{width:52}}>QTY</th>
                        <th className="border border-slate-600 px-2 py-2.5 text-right" style={{width:90}}>DISCOUNT</th>
                        <th className="border border-slate-600 px-2 py-2.5 text-right" style={{width:100}}>RATE (₹)</th>
                        <th className="border border-slate-600 px-2 py-2.5 text-right" style={{width:110}}>AMOUNT (₹)</th>
                        <th className="border border-slate-600 px-2 py-2.5 text-center" style={{width:30}}>🗑</th>
                      </tr>
                    </thead>
                    <tbody>
                      {itemRows.map((row, idx) => {
                        const amt = rowAmt(row);
                        return (
                          <tr key={row.uid}
                            className="group hover:bg-blue-50 transition-colors"
                            style={{ background: idx % 2 === 0 ? "#fff" : "#f8fafc" }}>

                            {/* SL NO */}
                            <td className="border border-slate-100 px-1 py-1 text-center">
                              <input value={row.slNo}
                                onChange={(e) => updateItemRow(row.uid,"slNo",e.target.value)}
                                className="w-9 border border-slate-200 rounded px-1 py-0.5 text-center text-xs focus:outline-none focus:ring-1 focus:ring-blue-300 font-bold text-slate-700" />
                            </td>

                            {/* ITEM CODE */}
                            <td className="border border-slate-100 px-1 py-1">
                              <input value={row.itemCode}
                                onChange={(e) => updateItemRow(row.uid,"itemCode",e.target.value)}
                                placeholder="e.g. DC-01"
                                className="w-full border border-slate-200 rounded px-1 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-300 font-mono text-slate-700" />
                            </td>

                            {/* DESCRIPTION */}
                            <td className="border border-slate-100 px-1 py-1">
                              <input value={row.desc}
                                onChange={(e) => updateItemRow(row.uid,"desc",e.target.value)}
                                placeholder="Enter description…"
                                className="w-full border border-slate-200 rounded px-1 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-300 text-slate-700" />
                            </td>

                            {/* SIZE */}
                            <td className="border border-slate-100 px-1 py-1">
                              <input value={row.size}
                                onChange={(e) => updateItemRow(row.uid,"size",e.target.value)}
                                placeholder='e.g. 60"×28"×50"'
                                className="w-full border border-slate-200 rounded px-1 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-300 text-slate-500" />
                            </td>

                            {/* HSN CODE */}
                            <td className="border border-slate-100 px-1 py-1">
                              <input value={row.hsn}
                                onChange={(e) => updateItemRow(row.uid,"hsn",e.target.value)}
                                placeholder="7323"
                                className="w-full border border-slate-200 rounded px-1 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-300 font-mono text-center text-slate-600" />
                            </td>

                            {/* QTY */}
                            <td className="border border-slate-100 px-1 py-1">
                              <input type="number" min={0} value={row.qty}
                                onChange={(e) => updateItemRow(row.uid,"qty",e.target.value)}
                                placeholder="1"
                                className="w-full border border-slate-200 rounded px-1 py-0.5 text-center text-xs focus:outline-none focus:ring-1 focus:ring-blue-300 font-semibold text-slate-800" />
                            </td>

                            {/* DISCOUNT per row */}
                            <td className="border border-slate-100 px-1 py-1">
                              <input type="number" min={0} value={row.discount}
                                onChange={(e) => updateItemRow(row.uid,"discount",e.target.value)}
                                placeholder="0"
                                className="w-full border border-slate-200 rounded px-1 py-0.5 text-right text-xs focus:outline-none focus:ring-1 focus:ring-blue-300 font-mono text-slate-700" />
                            </td>

                            {/* RATE */}
                            <td className="border border-slate-100 px-1 py-1">
                              <input type="number" min={0} value={row.rate}
                                onChange={(e) => updateItemRow(row.uid,"rate",e.target.value)}
                                placeholder="NQ"
                                className="w-full border border-slate-200 rounded px-1 py-0.5 text-right text-xs focus:outline-none focus:ring-1 focus:ring-blue-300 font-mono text-slate-800" />
                            </td>

                            {/* AMOUNT — auto calculated */}
                            <td className="border border-slate-100 px-2 py-1.5 text-right font-mono font-bold text-slate-800">
                              {amt !== null
                                ? <span className="text-green-700">{fmt(amt)}</span>
                                : <span className="text-slate-300 font-normal text-[10px]">auto</span>}
                            </td>

                            {/* DELETE ROW */}
                            <td className="border border-slate-100 px-1 py-1 text-center">
                              <button onClick={() => deleteRow(row.uid)}
                                className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition-all text-sm leading-none"
                                title="Remove row">✕</button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* ── Add More button ── */}
                <div className="px-4 py-3 border-t border-slate-100 bg-slate-50">
                  <button onClick={addRow}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-dashed border-blue-300 text-blue-600 hover:border-blue-500 hover:bg-blue-50 text-xs font-bold transition-all active:scale-95">
                    <span className="text-base leading-none">+</span>
                    Add More Item
                  </button>
                </div>

                {/* ── Totals ── */}
                <div className="border-t-2 border-slate-300">
                  {([
                    ["TOTAL (GROSS)",      gross,        "bg-yellow-50  text-yellow-900 font-bold"],
                    ["LESS – DISCOUNT",    overallDisc,  "bg-orange-50  text-orange-700"],
                    ["TOTAL AFTER DISC.",  afterDiscount,"bg-orange-100 text-orange-900 font-bold"],
                    ["GST @ 18%",          gst,          "bg-red-50     text-red-700"],
                    ["GRAND TOTAL",        grandTotal,   "bg-green-600  text-white font-bold text-sm"],
                  ] as [string,number,string][]).map(([label,val,cls]) => (
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
            )}

          </div>
        </div>

        {/* ── BOTTOM BAR ── */}
        <div className="flex-shrink-0 bg-white border-t border-slate-200 px-6 py-3 flex items-center justify-between">
          <p className="text-xs text-slate-500">
            {step === 2 && (
              <><strong className="text-slate-700">{itemRows.length}</strong> items &nbsp;·&nbsp;
              Grand Total: <strong className="text-green-700 text-sm">₹ {fmt(grandTotal)}</strong></>
            )}
            {step === 1 && <span className="text-blue-600 font-semibold">Step 1 of 2 — Fill party details then click Next</span>}
          </p>
          <div className="flex gap-3 items-center flex-wrap justify-end">
            {/* Download buttons in bottom bar on step 2 */}
            {step === 2 && (
              <QuotationDownload
                quotation={initialData!}
                partyName={partyName}
                quotationNo={quotationNo}
                date={date}
                subject={subject}
                rows={itemRows.map((r) => ({
                  slNo: r.slNo, itemCode: r.itemCode, desc: r.desc,
                  size: r.size, hsn: r.hsn, qty: r.qty,
                  discount: r.discount, rate: r.rate,
                  amt: rowAmt(r),
                }))}
                gross={gross}
                discount={overallDisc}
                afterDiscount={afterDiscount}
                gst={gst}
                grandTotal={grandTotal}
              />
            )}
            <button onClick={onClose}
              className="px-5 py-2 rounded-lg border border-slate-200 text-slate-600 text-sm hover:bg-slate-50 transition-colors">
              Cancel
            </button>
            {step === 1 && (
              <button onClick={goToStep2}
                className="px-6 py-2 rounded-lg text-white text-sm font-bold shadow hover:brightness-110 active:scale-95 transition-all"
                style={{ background:"linear-gradient(135deg,#1e3a5f,#2563eb)" }}>
                Next → Items
              </button>
            )}
            {step === 2 && (
              <button onClick={handleSave}
                className="px-6 py-2 rounded-lg text-white text-sm font-bold shadow hover:brightness-110 active:scale-95 transition-all"
                style={{ background:"linear-gradient(135deg,#059669,#16a34a)" }}>
                💾 {isEdit ? "Update Quotation" : "Save Quotation"}
              </button>
            )}
          </div>
        </div>

      </div>
    </>
  );
}
