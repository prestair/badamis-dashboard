"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useQuotations, SavedQuotation, SavedRowState } from "@/context/QuotationContext";
import { useAuth } from "@/context/AuthContext";
import { PrestairBrandHeader } from "@/components/PrestairLogo";
import { getRequesterInitials } from "@/components/RequesterManager";
import dynamic from "next/dynamic";

const QuotationDownload = dynamic(() => import("@/components/QuotationDownload"), { ssr: false });

// Generate quotation number based on FY.
// Numbering resets to 1 each financial year (April 1).
// For FY 2026-27, minimum starts at 554 (offset for pre-existing quotations).
function generateQuotationNo(quotations: { quotationNo: string; date: string }[], fullName = "", requesterName = ""): string {
  const now = new Date();
  const currentMonth = now.getMonth() + 1; // 1-12
  const currentYear = now.getFullYear();
  const fyStartYear = currentMonth >= 4 ? currentYear : currentYear - 1;
  const year = fyStartYear % 100;
  const nextYear = (fyStartYear + 1) % 100;
  const fyPrefix = `PS/${year}-${nextYear}/QT-`;

  // Find the highest number already used in this FY
  let maxNum = 0;
  for (const q of quotations) {
    const qNo = q.quotationNo || "";
    if (qNo.startsWith(fyPrefix)) {
      // Extract digits after prefix, ignoring trailing initials like " MN"
      const afterPrefix = qNo.slice(fyPrefix.length).trim();
      const match = afterPrefix.match(/^(\d+)/);
      if (match) {
        const parsed = parseInt(match[1], 10);
        if (parsed > maxNum) maxNum = parsed;
      }
    }
  }

  // Floor: for FY starting 2026 (i.e. 2026-27), start at minimum 554
  // For any future FY, start at 1
  const floor = fyStartYear === 2026 ? 553 : 0;
  const nextNum = Math.max(maxNum, floor) + 1;
  const num = String(nextNum).padStart(4, "0");

  const actorInitials = getInitials(fullName);
  const reqInitials = requesterName ? getRequesterInitials(requesterName) : "";
  // Format: PS/26-27/QT-0620/PS-AB  (slash before actor initials, dash before requester initials)
  let suffix = actorInitials ? "/" + actorInitials : "";
  if (reqInitials) suffix += (suffix ? "-" : "/") + reqInitials;
  return `PS/${year}-${nextYear}/QT-${num}${suffix}`;
}

// Get first letter of first name and surname
function getInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// Format stored YYYY-MM-DD to DD/MM/YYYY for display
function fmtDate(dateStr: string): string {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-");
  if (!y || !m || !d) return dateStr;
  return `${d}/${m}/${y}`;
}

// ── Types ──────────────────────────────────────────────────────────────────────
type QuotationItemName = {
  id: string;
  item_name: string;
};

type RequesterEntry = {
  id: string;
  name: string;
};

type ItemRow = {
  uid:      string; // unique key for React
  rowType:  "item" | "section";
  sectionId: string;
  slNo:     string;
  itemCode: string;
  desc:     string;
  size:     string;
  hsn:      string;
  qty:      string;
  additionalColumn: string;
  rate:     string;
};

type Props = { onClose: () => void; initialData?: SavedQuotation | null };

let uidCounter = 1;
function newUid() { return `row-${uidCounter++}`; }

function blankRow(slNo: number): ItemRow {
  return {
    uid: newUid(), rowType: "item", sectionId: "", slNo: String(slNo),
    itemCode: "", desc: "", size: "", hsn: "", qty: "",
    additionalColumn: "", rate: "",
  };
}

function blankSection(title = ""): ItemRow {
  const uid = newUid();
  return {
    uid, rowType: "section", sectionId: `section-${Date.now()}-${uid}`,
    slNo: "", itemCode: "", desc: title, size: "", hsn: "", qty: "",
    additionalColumn: "", rate: "",
  };
}

function renumberItemRows(rows: ItemRow[]): ItemRow[] {
  let itemNumber = 0;
  return rows.map((row) => row.rowType === "section"
    ? { ...row, slNo: "" }
    : { ...row, slNo: String(++itemNumber) });
}

function initItemRows(initial?: SavedQuotation | null): ItemRow[] {
  if (!initial || initial.rows.length === 0) {
    return [blankSection("SECTION 1"), blankRow(1)];
  }

  let itemNumber = 0;
  return initial.rows.map((row) => {
    if (row.rowType === "section") {
      return {
        uid: newUid(), rowType: "section", sectionId: row.id,
        slNo: "", itemCode: "", desc: row.desc || row.section,
        size: "", hsn: "", qty: "", additionalColumn: "", rate: "",
      };
    }

    return {
      uid: newUid(), rowType: "item", sectionId: "",
      slNo: String(++itemNumber), itemCode: row.id, desc: row.desc,
      size: row.size, hsn: row.hsn, qty: String(row.qty),
      additionalColumn: row.additionalColumn,
      rate: row.rate !== null ? String(row.rate) : "",
    };
  });
}

export default function QuotationModal({ onClose, initialData }: Props) {
  const { saveQuotation, updateQuotation, quotations } = useQuotations();
  const { loggedUser, loggedRole, users } = useAuth();
  const actorName = users.find((user) => user.username === loggedUser)?.fullName || loggedUser || "Unknown";
  const isEdit = !!initialData?.dbId;
  const canEditQuotationNumber = loggedRole === "admin";
  const initialLegacyDiscount = initialData?.discounts.legacyAmount ?? 0;

  // ── Step state ────────────────────────────────────────────────────────────
  const [step, setStep] = useState<1 | 2>(1);

  // ── Step 1: Party / Quotation details ─────────────────────────────────────
  const [date,         setDate]         = useState(initialData?.date         ?? "");
  const [partyName,    setPartyName]    = useState(initialData?.partyName    ?? "");
  const [partyAddress, setPartyAddress] = useState(initialData?.partyAddress ?? "");
  const [partyGST,     setPartyGST]     = useState(initialData?.partyGST    ?? "");
  const [attention,    setAttention]    = useState(initialData?.attention    ?? "");
  const [quotationNo,  setQuotationNo]  = useState(initialData?.quotationNo || generateQuotationNo(quotations, actorName));  const [subject,      setSubject]      = useState(initialData?.subject      ?? "");
  const [seasonalEnabled, setSeasonalEnabled] = useState(initialData?.discounts.seasonal.enabled ?? false);
  const [seasonalDiscount, setSeasonalDiscount] = useState(
    initialData?.discounts.seasonal.amount ? String(initialData.discounts.seasonal.amount) : ""
  );
  const [specialEnabled, setSpecialEnabled] = useState(
    (initialData?.discounts.special.enabled ?? false) || initialLegacyDiscount > 0
  );
  const [specialDiscount, setSpecialDiscount] = useState(() => {
    const storedSpecial = initialData?.discounts.special.amount ?? 0;
    const amount = storedSpecial > 0 ? storedSpecial : initialLegacyDiscount;
    return amount > 0 ? String(amount) : "";
  });
  const [transportationCharges, setTransportationCharges] = useState(
    initialData?.discounts.transportationAmount ? String(initialData.discounts.transportationAmount) : ""
  );
  const [packingCharges, setPackingCharges] = useState(
    initialData?.discounts.packingAmount ? String(initialData.discounts.packingAmount) : ""
  );
  // Part A/B state
  const [discountPercentA, setDiscountPercentA] = useState(
    initialData?.discounts.discountPercentA ? String(initialData.discounts.discountPercentA) : ""
  );
  const [partBEnabled, setPartBEnabled] = useState(initialData?.discounts.partBEnabled ?? false);
  const [discountPercentB, setDiscountPercentB] = useState(
    initialData?.discounts.discountPercentB ? String(initialData.discounts.discountPercentB) : ""
  );
  // GST toggle — default true (backward compat)
  const [gstEnabled, setGstEnabled] = useState(initialData?.discounts.gstEnabled !== false);
  // Discount % toggles
  const [discountAEnabled, setDiscountAEnabled] = useState(
    (initialData?.discounts.discountPercentA ?? 0) > 0
  );
  const [discountBEnabled, setDiscountBEnabled] = useState(
    (initialData?.discounts.discountPercentB ?? 0) > 0
  );
  const [step1Errors, setStep1Errors] = useState<Record<string,string>>({});

  // ── Requester state ────────────────────────────────────────────────────────
  const [requesterOptions, setRequesterOptions] = useState<RequesterEntry[]>([]);
  const [requester, setRequester] = useState(initialData?.requester ?? "");

  // ── Step 2: Item rows ──────────────────────────────────────────────────────
  const [itemRows, setItemRows] = useState<ItemRow[]>(() => initItemRows(initialData));
  const [partBItemRows, setPartBItemRows] = useState<ItemRow[]>(() => {
    if (!initialData?.partBRows || initialData.partBRows.length === 0) {
      return [blankSection("PART B - SECTION 1"), blankRow(1)];
    }
    let itemNumber = 0;
    return initialData.partBRows.map((row) => {
      if (row.rowType === "section") {
        return {
          uid: newUid(), rowType: "section" as const, sectionId: row.id,
          slNo: "", itemCode: "", desc: row.desc || row.section,
          size: "", hsn: "", qty: "", additionalColumn: "", rate: "",
        };
      }
      return {
        uid: newUid(), rowType: "item" as const, sectionId: "",
        slNo: String(++itemNumber), itemCode: row.id, desc: row.desc,
        size: row.size, hsn: row.hsn, qty: String(row.qty),
        additionalColumn: row.additionalColumn,
        rate: row.rate !== null ? String(row.rate) : "",
      };
    });
  });
  const [itemNameOptions, setItemNameOptions] = useState<QuotationItemName[]>([]);
  const [itemNameLoadError, setItemNameLoadError] = useState("");
  const [saved,       setSaved]       = useState(false);
  const [savedSerial, setSavedSerial] = useState<number | null>(null);

  const loadItemNameOptions = useCallback(async () => {
    try {
      const response = await fetch("/api/quotation-item-names", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Unable to load Item Names.");
      setItemNameOptions(Array.isArray(data) ? data : []);
      setItemNameLoadError("");
    } catch (error) {
      setItemNameLoadError(error instanceof Error ? error.message : "Unable to load Item Names.");
    }
  }, []);

  const loadRequesterOptions = useCallback(async () => {
    try {
      const res = await fetch("/api/requesters", { cache: "no-store" });
      const data = await res.json();
      setRequesterOptions(Array.isArray(data) ? data : []);
    } catch { /* silent - requester dropdown stays empty */ }
  }, []);

  useEffect(() => {
    void loadItemNameOptions();
    void loadRequesterOptions();
  }, [loadItemNameOptions, loadRequesterOptions]);

  // Auto-update quotation number when requester changes (new quotation only)
  useEffect(() => {
    if (!isEdit) {
      setQuotationNo(generateQuotationNo(quotations, actorName, requester));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requester]);

  // close on Escape
  useEffect(() => {
    const fn = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [onClose]);

  // ── Row helpers ────────────────────────────────────────────────────────────
  function updateItemRow(uid: string, field: Exclude<keyof ItemRow, "rowType">, value: string) {
    setItemRows((prev) =>
      prev.map((r) => (r.uid === uid ? { ...r, [field]: value } : r))
    );
    setSaved(false);
  }

  function addRow() {
    setItemRows((prev) => {
      const itemCount = prev.filter((row) => row.rowType === "item").length;
      return [...prev, blankRow(itemCount + 1)];
    });
    setSaved(false);
  }

  function addSection() {
    setItemRows((prev) => {
      const sectionCount = prev.filter((row) => row.rowType === "section").length;
      return [...prev, blankSection(`SECTION ${sectionCount + 1}`)];
    });
    setSaved(false);
  }

  function deleteRow(uid: string) {
    setItemRows((prev) => renumberItemRows(prev.filter((r) => r.uid !== uid)));
    setSaved(false);
  }

  function moveRow(uid: string, direction: "up" | "down") {
    setItemRows((prev) => {
      const idx = prev.findIndex((r) => r.uid === uid);
      if (idx === -1) return prev;
      const targetIdx = direction === "up" ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[targetIdx]] = [next[targetIdx], next[idx]];
      return renumberItemRows(next);
    });
    setSaved(false);
  }

  function insertRowAfter(idx: number) {
    setItemRows((prev) => {
      const next = [...prev];
      const itemCount = next.filter((r) => r.rowType === "item").length;
      next.splice(idx + 1, 0, blankRow(itemCount + 1));
      return renumberItemRows(next);
    });
    setSaved(false);
  }

  const itemCount = itemRows.filter((row) => row.rowType === "item").length;

  // ── Part B Row helpers ─────────────────────────────────────────────────────
  function updatePartBRow(uid: string, field: Exclude<keyof ItemRow, "rowType">, value: string) {
    setPartBItemRows((prev) =>
      prev.map((r) => (r.uid === uid ? { ...r, [field]: value } : r))
    );
    setSaved(false);
  }

  function addPartBRow() {
    setPartBItemRows((prev) => {
      const itemCount = prev.filter((row) => row.rowType === "item").length;
      return [...prev, blankRow(itemCount + 1)];
    });
    setSaved(false);
  }

  function addPartBSection() {
    setPartBItemRows((prev) => {
      const sectionCount = prev.filter((row) => row.rowType === "section").length;
      return [...prev, blankSection(`PART B - SECTION ${sectionCount + 1}`)];
    });
    setSaved(false);
  }

  function deletePartBRow(uid: string) {
    setPartBItemRows((prev) => renumberItemRows(prev.filter((r) => r.uid !== uid)));
    setSaved(false);
  }

  function movePartBRow(uid: string, direction: "up" | "down") {
    setPartBItemRows((prev) => {
      const idx = prev.findIndex((r) => r.uid === uid);
      if (idx === -1) return prev;
      const targetIdx = direction === "up" ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[targetIdx]] = [next[targetIdx], next[idx]];
      return renumberItemRows(next);
    });
    setSaved(false);
  }

  function insertPartBRowAfter(idx: number) {
    setPartBItemRows((prev) => {
      const next = [...prev];
      const itemCount = next.filter((r) => r.rowType === "item").length;
      next.splice(idx + 1, 0, blankRow(itemCount + 1));
      return renumberItemRows(next);
    });
    setSaved(false);
  }

  const partBItemCount = partBItemRows.filter((row) => row.rowType === "item").length;

  // ── Per-row gross amount = qty × rate ─────────────────────────────────────
  function rowAmt(row: ItemRow): number | null {
    if (row.rowType === "section") return null;
    const qty  = Number(row.qty);
    const rate = Number(row.rate);
    if (!row.qty || !row.rate || isNaN(qty) || isNaN(rate)) return null;
    return qty * rate;
  }

  // ── Live totals ────────────────────────────────────────────────────────────
  const {
    grossA,
    discountAmountA,
    specialAmount,
    seasonalAmount,
    totalDiscountA,
    afterDiscountA,
    finalTotalA,
    grossB,
    discountAmountB,
    afterDiscountB,
    combinedAfterDiscount,
    transportationAmount,
    packingAmount,
    taxableAmount,
    gst,
    grandTotal,
    // Backward-compatible aliases used by existing UI/download
    gross,
    afterDiscount,
  } = useMemo(() => {
    // Part A — new calculation: afterDiscountA excludes seasonal, finalTotalA = afterDiscountA - seasonal
    const grossA = itemRows.reduce((sum, row) => sum + (rowAmt(row) ?? 0), 0);
    const pctA = discountAEnabled ? Math.max(0, Number(discountPercentA) || 0) : 0;
    const discountAmountA = Math.round(grossA * pctA / 100);
    const specialAmount = specialEnabled ? Math.max(0, Number(specialDiscount) || 0) : 0;
    const seasonalAmount = seasonalEnabled ? Math.max(0, Number(seasonalDiscount) || 0) : 0;
    const totalDiscountA = discountAmountA + specialAmount + seasonalAmount;
    const afterDiscountA = Math.max(0, grossA - discountAmountA - specialAmount); // excludes seasonal
    const finalTotalA    = Math.max(0, afterDiscountA - seasonalAmount);           // after seasonal

    // Part B
    const grossB = partBEnabled ? partBItemRows.reduce((sum, row) => sum + (rowAmt(row) ?? 0), 0) : 0;
    const pctB = discountBEnabled ? Math.max(0, Number(discountPercentB) || 0) : 0;
    const discountAmountB = Math.round(grossB * pctB / 100);
    const afterDiscountB = Math.max(0, grossB - discountAmountB);

    // Combined — use finalTotalA (after seasonal) as effective Part A amount
    const effectiveA = seasonalEnabled ? finalTotalA : afterDiscountA;
    const combinedAfterDiscount = effectiveA + (partBEnabled ? afterDiscountB : 0);
    const transportationAmount = Math.max(0, Number(transportationCharges) || 0);
    const packingAmount = Math.max(0, Number(packingCharges) || 0);
    const taxableAmount = combinedAfterDiscount + transportationAmount + packingAmount;
    const gst = Math.round(taxableAmount * 0.18);
    const grandTotal = taxableAmount + gst;

    return {
      grossA, discountAmountA, specialAmount, seasonalAmount, totalDiscountA, afterDiscountA, finalTotalA,
      grossB, discountAmountB, afterDiscountB,
      combinedAfterDiscount, transportationAmount, packingAmount, taxableAmount, gst, grandTotal,
      // Backward-compat: gross = A gross, afterDiscount = combinedAfterDiscount
      gross: grossA,
      afterDiscount: combinedAfterDiscount,
    };
  }, [
    itemRows, partBItemRows, partBEnabled,
    discountAEnabled, discountPercentA, seasonalEnabled, seasonalDiscount, specialEnabled, specialDiscount,
    discountBEnabled, discountPercentB, transportationCharges, packingCharges,
  ]);

  const fmt = (n: number) => n.toLocaleString("en-IN");

  // ── Validation Step 1 ─────────────────────────────────────────────────────
  function validateStep1() {
    const e: Record<string,string> = {};
    if (!partyName.trim()) e.partyName = "Required";
    if (!date)             e.date      = "Required";
    if (!requester)        e.requester = "Required";
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
      if (r.rowType === "section") {
        const heading = r.desc.trim() || "Untitled Section";
        return {
          id: r.sectionId,
          rowType: "section",
          desc: heading,
          size: "",
          hsn: "",
          section: heading,
          qty: 0,
          additionalColumn: "",
          discount: 0,
          discountIsPerUnit: true,
          rate: null,
          amt: null,
          checked: true,
        };
      }

      const rate = r.rate === "" ? null : Number(r.rate);
      const qty  = Number(r.qty) || 0;
      const amt  = rowAmt(r);
      return { id: r.itemCode || r.slNo, rowType: "item", desc: r.desc, size: r.size, hsn: r.hsn,
               section: "Custom", qty, additionalColumn: r.additionalColumn,
               discount: 0, discountIsPerUnit: false, rate, amt, checked: true };
    });

    const savedPartBRows: SavedRowState[] = partBItemRows.map((r) => {
      if (r.rowType === "section") {
        const heading = r.desc.trim() || "Untitled Section";
        return {
          id: r.sectionId, rowType: "section", desc: heading, size: "", hsn: "",
          section: heading, qty: 0, additionalColumn: "", discount: 0,
          discountIsPerUnit: true, rate: null, amt: null, checked: true,
        };
      }
      const rate = r.rate === "" ? null : Number(r.rate);
      const qty  = Number(r.qty) || 0;
      const amt  = rowAmt(r);
      return { id: r.itemCode || r.slNo, rowType: "item", desc: r.desc, size: r.size, hsn: r.hsn,
               section: "Custom", qty, additionalColumn: r.additionalColumn,
               discount: 0, discountIsPerUnit: false, rate, amt, checked: true };
    });

    const payload = {
      quotationNo, date, partyName, partyAddress, partyGST, subject, attention, requester,
      rows: savedRows, gross: grossA, discount: totalDiscountA,
      discounts: {
        seasonal: { enabled: seasonalEnabled, amount: seasonalAmount },
        special: { enabled: specialEnabled, amount: specialAmount },
        legacyAmount: 0,
        transportationAmount,
        packingAmount,
        discountPercentA: Math.max(0, Number(discountPercentA) || 0),
        partBEnabled,
        discountPercentB: partBEnabled ? Math.max(0, Number(discountPercentB) || 0) : 0,
        gstEnabled,
      },
      afterDiscount: combinedAfterDiscount, gst, grandTotal,
      partBRows: partBEnabled ? savedPartBRows : undefined,
    };

    try {
      if (isEdit && initialData) {
        await updateQuotation(initialData.dbId, payload, actorName);
        setSavedSerial(initialData.serialNo);
      } else {
        const serial = await saveQuotation(payload, actorName);
        setSavedSerial(serial);
      }
      setSaved(true);
      onClose();
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
          style={{ background: "linear-gradient(135deg,#0f172a,#1e3a5f,#2563eb)" }}>
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
                quotation={initialData ?? undefined}
                partyName={partyName}
                partyAddress={partyAddress}
                partyGST={partyGST}
                attention={attention}
                quotationNo={quotationNo}
                date={date}
                subject={subject}
                rows={itemRows.map((r) => ({
                  rowType: r.rowType, slNo: r.slNo, itemCode: r.itemCode, desc: r.desc,
                  size: r.size, hsn: r.hsn, qty: r.qty,
                  additionalColumn: r.additionalColumn, rate: r.rate,
                  amt: rowAmt(r),
                  section: r.rowType === "section" ? r.desc : undefined,
                }))}
                gross={grossA}
                discounts={{
                  seasonal: { enabled: seasonalEnabled, amount: seasonalAmount },
                  special: { enabled: specialEnabled, amount: specialAmount },
                  legacyAmount: 0,
                  transportationAmount,
                  packingAmount,
                  discountPercentA: Math.max(0, Number(discountPercentA) || 0),
                  partBEnabled,
                  discountPercentB: partBEnabled ? Math.max(0, Number(discountPercentB) || 0) : 0,
                }}
                afterDiscount={combinedAfterDiscount}
                gst={gst}
                grandTotal={grandTotal}
                partBRows={partBEnabled ? partBItemRows.map((r) => ({
                  rowType: r.rowType, slNo: r.slNo, itemCode: r.itemCode, desc: r.desc,
                  size: r.size, hsn: r.hsn, qty: r.qty,
                  additionalColumn: r.additionalColumn, rate: r.rate,
                  amt: rowAmt(r),
                  section: r.rowType === "section" ? r.desc : undefined,
                })) : undefined}
                grossB={partBEnabled ? grossB : undefined}
                afterDiscountB={partBEnabled ? afterDiscountB : undefined}
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
                {/* Company branding */}
                <PrestairBrandHeader />

                <div className="p-5 space-y-4" onKeyDown={(e) => { if (e.key === "Enter" && (e.target as HTMLElement).tagName !== "TEXTAREA") { e.preventDefault(); const form = e.currentTarget; const focusable = Array.from(form.querySelectorAll<HTMLElement>('input:not([disabled]),select:not([disabled]),textarea:not([disabled]),button:not([disabled])')); const idx = focusable.indexOf(document.activeElement as HTMLElement); if (idx >= 0 && idx < focusable.length - 1) focusable[idx + 1].focus(); } }}>

                  {/* ── Row 1: Party Name | Date + Quotation No ── */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Party Name *</label>
                      <div className="mt-1 flex">
                        <span className="flex items-center rounded-l border border-r-0 border-slate-300 bg-slate-100 px-2 text-xs font-bold text-slate-700">M/S</span>
                        <input value={partyName}
                          onChange={(e) => { setPartyName(e.target.value); setStep1Errors((x) => ({...x,partyName:""})); }}
                          className={inp(step1Errors.partyName) + " rounded-l-none font-semibold"} />
                      </div>
                      {step1Errors.partyName && <p className="text-red-500 text-[10px] mt-0.5">{step1Errors.partyName}</p>}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Date *</label>
                        <input type="date" value={date}
                          onChange={(e) => { setDate(e.target.value); setStep1Errors((x) => ({...x,date:""})); }}
                          className={inp(step1Errors.date) + " mt-1"} />
                        {step1Errors.date && <p className="text-red-500 text-[10px] mt-0.5">{step1Errors.date}</p>}
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">
                          Quotation No.{canEditQuotationNumber ? "" : " (Admin)"}
                        </label>
                        <input value={quotationNo}
                          onChange={(e) => setQuotationNo(e.target.value)}
                          readOnly={!canEditQuotationNumber}
                          title={canEditQuotationNumber ? "Quotation number" : "Only admin can edit"}
                          className={`${inp()} mt-1 ${!canEditQuotationNumber ? "cursor-not-allowed bg-slate-100 text-slate-500" : ""}`} />
                      </div>
                    </div>
                  </div>

                  {/* ── Row 2: Address | Requester + GST + Kind Attn ── */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-stretch">
                    <div className="flex flex-col">
                      <label className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Address</label>
                      <textarea value={partyAddress} onChange={(e) => setPartyAddress(e.target.value)}
                        className={inp() + " resize-none mt-1 flex-1"} style={{minHeight:"112px"}} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Requester *</label>
                        <select value={requester}
                          onChange={(e) => { setRequester(e.target.value); setStep1Errors((x) => ({...x, requester: ""})); }}
                          className={inp(step1Errors.requester) + " mt-1"}>
                          <option value="">— Select —</option>
                          {requesterOptions.map((r) => (
                            <option key={r.id} value={r.name}>{r.name}</option>
                          ))}
                        </select>
                        {step1Errors.requester && <p className="text-red-500 text-[10px] mt-0.5">{step1Errors.requester}</p>}
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">GST No.</label>
                        <input value={partyGST} onChange={(e) => setPartyGST(e.target.value)}
                          className={inp() + " mt-1"} />
                      </div>
                      <div className="col-span-2">
                        <label className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Kind Attention</label>
                        <input value={attention} onChange={(e) => setAttention(e.target.value)}
                          className={inp() + " mt-1"} />
                      </div>
                    </div>
                  </div>

                  {/* ── Subject ── */}
                  <div>
                    <label className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Subject</label>
                    <input value={subject} onChange={(e) => setSubject(e.target.value)}
                      className={inp() + " mt-1 font-semibold"} />
                  </div>

                  {/* ── Discounts & Configuration (Part A | Part B side by side) ── */}
                  <div className="rounded-xl border border-slate-200 overflow-hidden">
                    <div className="bg-slate-100 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-slate-500">
                      Discounts & Configuration
                    </div>
                    <div className="grid grid-cols-2 divide-x divide-slate-200">

                      {/* ── PART A ── */}
                      <div className="divide-y divide-slate-100">
                        <div className="bg-blue-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-blue-600 text-center">Part A</div>

                        {/* Discount % Part A */}
                        <div className="flex items-center justify-between px-3 py-2">
                          <span className="text-xs text-slate-600 font-medium">Discount %</span>
                          <div className="flex items-center gap-2">
                            <div className="flex rounded-md overflow-hidden border border-slate-200 text-[10px] font-bold">
                              <button type="button" onClick={() => setDiscountAEnabled(true)} aria-pressed={discountAEnabled}
                                className={`px-2.5 py-1 transition-colors ${discountAEnabled ? "bg-green-600 text-white" : "bg-white text-slate-400 hover:bg-slate-50"}`}>YES</button>
                              <button type="button" onClick={() => { setDiscountAEnabled(false); setDiscountPercentA(""); }} aria-pressed={!discountAEnabled}
                                className={`px-2.5 py-1 transition-colors border-l border-slate-200 ${!discountAEnabled ? "bg-slate-600 text-white" : "bg-white text-slate-400 hover:bg-slate-50"}`}>NO</button>
                            </div>
                            {discountAEnabled && (
                              <input type="number" min="0" max="100" step="0.01" value={discountPercentA}
                                onChange={(e) => setDiscountPercentA(e.target.value)} placeholder="0"
                                className="w-16 rounded border border-slate-300 bg-white px-2 py-1 text-right text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-300" />
                            )}
                          </div>
                        </div>

                        {/* Special Discount */}
                        <div className="flex items-center justify-between px-3 py-2">
                          <span className="text-xs text-slate-600 font-medium">Special Discount</span>
                          <div className="flex rounded-md overflow-hidden border border-slate-200 text-[10px] font-bold">
                            <button type="button" onClick={() => setSpecialEnabled(true)} aria-pressed={specialEnabled}
                              className={`px-2.5 py-1 transition-colors ${specialEnabled ? "bg-green-600 text-white" : "bg-white text-slate-400 hover:bg-slate-50"}`}>YES</button>
                            <button type="button" onClick={() => setSpecialEnabled(false)} aria-pressed={!specialEnabled}
                              className={`px-2.5 py-1 transition-colors border-l border-slate-200 ${!specialEnabled ? "bg-slate-600 text-white" : "bg-white text-slate-400 hover:bg-slate-50"}`}>NO</button>
                          </div>
                        </div>

                        {/* Seasonal Discount */}
                        <div className="flex items-center justify-between px-3 py-2">
                          <span className="text-xs text-slate-600 font-medium">Seasonal Discount</span>
                          <div className="flex rounded-md overflow-hidden border border-slate-200 text-[10px] font-bold">
                            <button type="button" onClick={() => setSeasonalEnabled(true)} aria-pressed={seasonalEnabled}
                              className={`px-2.5 py-1 transition-colors ${seasonalEnabled ? "bg-green-600 text-white" : "bg-white text-slate-400 hover:bg-slate-50"}`}>YES</button>
                            <button type="button" onClick={() => setSeasonalEnabled(false)} aria-pressed={!seasonalEnabled}
                              className={`px-2.5 py-1 transition-colors border-l border-slate-200 ${!seasonalEnabled ? "bg-slate-600 text-white" : "bg-white text-slate-400 hover:bg-slate-50"}`}>NO</button>
                          </div>
                        </div>

                        {/* GST Required */}
                        <div className="flex items-center justify-between px-3 py-2">
                          <span className="text-xs text-slate-600 font-medium">GST Required</span>
                          <div className="flex rounded-md overflow-hidden border border-slate-200 text-[10px] font-bold">
                            <button type="button" onClick={() => setGstEnabled(true)} aria-pressed={gstEnabled}
                              className={`px-2.5 py-1 transition-colors ${gstEnabled ? "bg-green-600 text-white" : "bg-white text-slate-400 hover:bg-slate-50"}`}>YES</button>
                            <button type="button" onClick={() => setGstEnabled(false)} aria-pressed={!gstEnabled}
                              className={`px-2.5 py-1 transition-colors border-l border-slate-200 ${!gstEnabled ? "bg-slate-600 text-white" : "bg-white text-slate-400 hover:bg-slate-50"}`}>NO</button>
                          </div>
                        </div>
                      </div>

                      {/* ── PART B ── */}
                      <div className="divide-y divide-slate-100">
                        <div className="bg-indigo-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-indigo-600 text-center">Part B</div>

                        {/* Enable Part B */}
                        <div className="flex items-center justify-between px-3 py-2">
                          <span className="text-xs text-slate-600 font-medium">Enable Part B</span>
                          <div className="flex rounded-md overflow-hidden border border-slate-200 text-[10px] font-bold">
                            <button type="button" onClick={() => setPartBEnabled(true)} aria-pressed={partBEnabled}
                              className={`px-2.5 py-1 transition-colors ${partBEnabled ? "bg-green-600 text-white" : "bg-white text-slate-400 hover:bg-slate-50"}`}>YES</button>
                            <button type="button" onClick={() => setPartBEnabled(false)} aria-pressed={!partBEnabled}
                              className={`px-2.5 py-1 transition-colors border-l border-slate-200 ${!partBEnabled ? "bg-slate-600 text-white" : "bg-white text-slate-400 hover:bg-slate-50"}`}>NO</button>
                          </div>
                        </div>

                        {/* Discount % Part B */}
                        <div className={`flex items-center justify-between px-3 py-2 ${!partBEnabled ? "opacity-40 pointer-events-none" : ""}`}>
                          <span className="text-xs text-slate-600 font-medium">Discount %</span>
                          <div className="flex items-center gap-2">
                            <div className="flex rounded-md overflow-hidden border border-indigo-200 text-[10px] font-bold">
                              <button type="button" onClick={() => setDiscountBEnabled(true)} aria-pressed={discountBEnabled}
                                className={`px-2.5 py-1 transition-colors ${discountBEnabled ? "bg-green-600 text-white" : "bg-white text-slate-400 hover:bg-slate-50"}`}>YES</button>
                              <button type="button" onClick={() => { setDiscountBEnabled(false); setDiscountPercentB(""); }} aria-pressed={!discountBEnabled}
                                className={`px-2.5 py-1 transition-colors border-l border-indigo-200 ${!discountBEnabled ? "bg-slate-600 text-white" : "bg-white text-slate-400 hover:bg-slate-50"}`}>NO</button>
                            </div>
                            {discountBEnabled && partBEnabled && (
                              <input type="number" min="0" max="100" step="0.01" value={discountPercentB}
                                onChange={(e) => setDiscountPercentB(e.target.value)} placeholder="0"
                                className="w-16 rounded border border-indigo-200 bg-white px-2 py-1 text-right text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-300" />
                            )}
                          </div>
                        </div>

                        {/* Placeholder rows to match Part A height */}
                        <div className="px-3 py-2 text-xs text-slate-300 italic">—</div>
                        <div className="px-3 py-2 text-xs text-slate-300 italic">—</div>
                      </div>

                    </div>
                  </div>

                  <button onClick={goToStep2}
                    className="w-full py-2.5 rounded-lg text-white font-bold text-sm shadow hover:brightness-110 active:scale-95 transition-all"
                    style={{ background:"linear-gradient(135deg,#0f172a,#1e3a5f,#2563eb)" }}>
                    Next → Add Items
                  </button>
                </div>
              </div>
            )}

            {/* ════ STEP 2: Item Entries ════ */}
            {step === 2 && (
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">

                {/* Company branding */}
                <PrestairBrandHeader />

                {/* Quotation banner */}
                <div className="bg-slate-700 text-white text-center py-2 px-4">
                  <p className="font-bold text-sm">{partyName || "Party Name"}</p>
                  <p className="text-slate-300 text-xs">{quotationNo} &nbsp;|&nbsp; {fmtDate(date)}</p>
                </div>

                {/* Subject row */}
                <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 text-xs text-slate-600 font-semibold">
                  <span className="text-slate-400 font-normal">Subject: </span>{subject}
                </div>

                <datalist id="quotation-item-name-options">
                  {itemNameOptions.map((entry) => (
                    <option key={entry.id} value={entry.item_name} />
                  ))}
                </datalist>
                {itemNameLoadError && (
                  <p role="status" className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-700">
                    Item Name autofill is unavailable: {itemNameLoadError}
                  </p>
                )}

                {/* ── PART A Label ── */}
                <div className="bg-blue-700 text-white text-center py-1.5 px-4 text-xs font-bold uppercase tracking-wider">
                  PART - A
                </div>

                {/* ── Items Table ── */}
                <div className="max-h-[52vh] overflow-auto">
                  <table className="w-full border-collapse" style={{ fontSize:"11px" }}>
                    <thead className="sticky top-0 z-20 bg-slate-700 shadow-sm">
                      <tr className="bg-slate-700 text-white">
                        <th className="border border-slate-600 px-2 py-2.5 text-center" style={{width:42}}>SL NO</th>
                        <th className="border border-slate-600 px-2 py-2.5 text-left" style={{width:90}}>ITEM CODE</th>
                        <th className="border border-slate-600 px-3 py-2.5 text-left">ITEM NAME</th>
                        <th className="border border-slate-600 px-3 py-2.5 text-left" style={{width:220, minWidth:220}}>ADDITIONAL DESCRIPTION</th>
                        <th className="border border-slate-600 px-2 py-2.5 text-center" style={{width:100}}>SIZE</th>
                        <th className="border border-slate-600 px-2 py-2.5 text-center" style={{width:80}}>HSN CODE</th>
                        <th className="border border-slate-600 px-2 py-2.5 text-center" style={{width:52}}>QTY</th>
                        <th className="border border-slate-600 px-2 py-2.5 text-right" style={{width:100}}>RATE (₹)</th>
                        <th className="border border-slate-600 px-2 py-2.5 text-right" style={{width:110}}>AMOUNT (₹)</th>
                        <th className="border border-slate-600 px-1 py-2.5 text-center" style={{width:44}}>↕</th>
                        <th className="border border-slate-600 px-2 py-2.5 text-center" style={{width:30}}>🗑</th>
                      </tr>
                    </thead>
                    <tbody>
                      {itemRows.map((row, idx) => {
                        const amt = rowAmt(row);
                        if (row.rowType === "section") {
                          return (
                            <tr key={row.uid} className="group bg-blue-50">
                              <td colSpan={9} className="border border-blue-200 px-3 py-2">
                                <div className="flex items-center gap-3">
                                  <span className="whitespace-nowrap text-[10px] font-black uppercase tracking-widest text-blue-700">Section</span>
                                  <input
                                    value={row.desc}
                                    onChange={(event) => updateItemRow(row.uid, "desc", event.target.value)}
                                    placeholder="Enter section heading, e.g. Display"
                                    className="w-full rounded border border-blue-200 bg-white px-3 py-1.5 text-sm font-bold text-blue-950 focus:outline-none focus:ring-2 focus:ring-blue-300"
                                  />
                                </div>
                              </td>
                              <td className="border border-blue-200 px-1 py-1 text-center">
                                <div className="flex flex-col items-center gap-0.5">
                                  <button type="button" onClick={() => moveRow(row.uid, "up")} disabled={idx === 0}
                                    className="text-slate-400 hover:text-blue-600 disabled:opacity-20 disabled:cursor-not-allowed text-sm leading-none" title="Move up" aria-label="Move section up">▲</button>
                                  <button type="button" onClick={() => moveRow(row.uid, "down")} disabled={idx === itemRows.length - 1}
                                    className="text-slate-400 hover:text-blue-600 disabled:opacity-20 disabled:cursor-not-allowed text-sm leading-none" title="Move down" aria-label="Move section down">▼</button>
                                </div>
                              </td>
                              <td className="border border-blue-200 px-1 py-1 text-center">
                                <button
                                  type="button"
                                  onClick={() => deleteRow(row.uid)}
                                  className="text-slate-400 transition-colors hover:text-red-600"
                                  title="Remove section"
                                  aria-label="Remove section"
                                >
                                  ×
                                </button>
                              </td>
                            </tr>
                          );
                        }
                        return (
                          <tr key={row.uid}
                            className="group hover:bg-blue-50 transition-colors"
                            style={{ background: idx % 2 === 0 ? "#fff" : "#f8fafc" }}>

                            {/* SL NO */}
                            <td className="border border-slate-100 px-1 py-1 text-center font-bold text-black">
                              {row.slNo}
                            </td>

                            {/* ITEM CODE */}
                            <td className="border border-slate-100 px-1 py-1">
                              <input value={row.itemCode}
                                onChange={(e) => updateItemRow(row.uid,"itemCode",e.target.value)}
                                className="w-full border border-slate-200 rounded px-1 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-300 font-mono text-black" />
                            </td>

                            {/* ITEM NAME */}
                            <td className="border border-slate-100 px-1 py-1">
                              <input value={row.desc}
                                list="quotation-item-name-options"
                                autoComplete="off"
                                onChange={(e) => updateItemRow(row.uid,"desc",e.target.value)}
                                className="w-full border border-slate-200 rounded px-1 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-300 text-black" />
                            </td>

                            {/* ADDITIONAL DESCRIPTION */}
                            <td className="border border-slate-100 px-1 py-1" style={{minWidth:220}}>
                              <input value={row.additionalColumn}
                                onChange={(e) => updateItemRow(row.uid,"additionalColumn",e.target.value)}
                                className="w-full border border-slate-200 rounded px-1 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-300 text-black" />
                            </td>

                            {/* SIZE */}
                            <td className="border border-slate-100 px-1 py-1">
                              <input value={row.size}
                                onChange={(e) => updateItemRow(row.uid,"size",e.target.value)}
                                className="w-full border border-slate-200 rounded px-1 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-300 text-black" />
                            </td>

                            {/* HSN CODE */}
                            <td className="border border-slate-100 px-1 py-1">
                              <input value={row.hsn}
                                onChange={(e) => updateItemRow(row.uid,"hsn",e.target.value)}
                                className="w-full border border-slate-200 rounded px-1 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-300 font-mono text-center text-black" />
                            </td>

                            {/* QTY */}
                            <td className="border border-slate-100 px-1 py-1">
                              <input type="number" min={0} value={row.qty}
                                onChange={(e) => updateItemRow(row.uid,"qty",e.target.value)}
                                className="w-full border border-slate-200 rounded px-1 py-0.5 text-center text-xs focus:outline-none focus:ring-1 focus:ring-blue-300 font-semibold text-black" />
                            </td>

                            {/* RATE */}
                            <td className="border border-slate-100 px-1 py-1">
                              <input type="number" min={0} value={row.rate}
                                onChange={(e) => updateItemRow(row.uid,"rate",e.target.value)}
                                className="w-full border border-slate-200 rounded px-1 py-0.5 text-right text-xs focus:outline-none focus:ring-1 focus:ring-blue-300 font-mono text-black" />
                            </td>

                            {/* AMOUNT — auto calculated */}
                            <td className="border border-slate-100 px-2 py-1.5 text-right font-mono font-bold text-black">
                              {amt !== null
                                ? <span className="text-black">{fmt(amt)}</span>
                                : <span className="text-black font-normal">—</span>}
                            </td>

                            {/* MOVE ROW */}
                            <td className="border border-slate-100 px-1 py-1 text-center">
                              <div className="flex flex-col items-center gap-0.5">
                                <button type="button" onClick={() => moveRow(row.uid, "up")} disabled={idx === 0}
                                  className="text-slate-400 hover:text-blue-600 disabled:opacity-20 disabled:cursor-not-allowed text-xs leading-none" title="Move up" aria-label="Move row up">▲</button>
                                <button type="button" onClick={() => moveRow(row.uid, "down")} disabled={idx === itemRows.length - 1}
                                  className="text-slate-400 hover:text-blue-600 disabled:opacity-20 disabled:cursor-not-allowed text-xs leading-none" title="Move down" aria-label="Move row down">▼</button>
                              </div>
                            </td>

                            {/* DELETE ROW */}
                            <td className="border border-slate-100 px-1 py-1 text-center">
                              <button onClick={() => deleteRow(row.uid)}
                                className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition-all text-sm leading-none"
                                title="Remove row">✕</button>
                            </td>
                          </tr>
                        );
                      }).reduce<React.ReactNode[]>((acc, rowEl, idx) => {
                        acc.push(rowEl);
                        // After the last item in a section (before next section or end), show "+ Add Row" button
                        const row = itemRows[idx];
                        const nextRow = itemRows[idx + 1];
                        if (row.rowType === "item" && (!nextRow || nextRow.rowType === "section")) {
                          acc.push(
                            <tr key={`insert-after-${row.uid}`} className="bg-slate-50/50">
                              <td colSpan={11} className="border border-dashed border-slate-200 px-3 py-1 text-center">
                                <button type="button" onClick={() => insertRowAfter(idx)}
                                  className="text-[10px] font-bold text-blue-500 hover:text-blue-700 hover:bg-blue-50 px-3 py-0.5 rounded transition-colors"
                                  title="Insert row here">
                                  + Add Row
                                </button>
                              </td>
                            </tr>
                          );
                        }
                        return acc;
                      }, [])}
                    </tbody>
                  </table>
                </div>

                {/* ── Add More button ── */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50 px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <button onClick={addRow}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-dashed border-blue-300 text-blue-600 hover:border-blue-500 hover:bg-blue-50 text-xs font-bold transition-all active:scale-95">
                      <span className="text-base leading-none">+</span>
                      Add More Item
                    </button>
                    <button onClick={addSection}
                      className="flex items-center gap-2 rounded-lg border-2 border-dashed border-violet-300 px-4 py-2 text-xs font-bold text-violet-700 transition-all hover:border-violet-500 hover:bg-violet-50 active:scale-95">
                      <span className="text-base leading-none">+</span>
                      Add Section
                    </button>
                  </div>
                  <span className="text-xs text-slate-500">
                    {itemNameOptions.length} Item Name option{itemNameOptions.length === 1 ? "" : "s"}
                  </span>
                </div>

                {/* ── PART B ── */}
                {partBEnabled && (
                  <>
                    <div className="bg-indigo-700 text-white text-center py-1.5 px-4 text-xs font-bold uppercase tracking-wider mt-1">
                      PART - B
                    </div>

                    <div className="max-h-[52vh] overflow-auto">
                      <table className="w-full border-collapse" style={{ fontSize:"11px" }}>
                        <thead className="sticky top-0 z-20 bg-indigo-700 shadow-sm">
                          <tr className="bg-indigo-700 text-white">
                            <th className="border border-indigo-600 px-2 py-2.5 text-center" style={{width:42}}>SL NO</th>
                            <th className="border border-indigo-600 px-2 py-2.5 text-left" style={{width:90}}>ITEM CODE</th>
                            <th className="border border-indigo-600 px-3 py-2.5 text-left">ITEM NAME</th>
                            <th className="border border-indigo-600 px-3 py-2.5 text-left" style={{width:220, minWidth:220}}>ADDITIONAL DESCRIPTION</th>
                            <th className="border border-indigo-600 px-2 py-2.5 text-center" style={{width:100}}>SIZE</th>
                            <th className="border border-indigo-600 px-2 py-2.5 text-center" style={{width:80}}>HSN CODE</th>
                            <th className="border border-indigo-600 px-2 py-2.5 text-center" style={{width:52}}>QTY</th>
                            <th className="border border-indigo-600 px-2 py-2.5 text-right" style={{width:100}}>RATE (₹)</th>
                            <th className="border border-indigo-600 px-2 py-2.5 text-right" style={{width:110}}>AMOUNT (₹)</th>
                            <th className="border border-indigo-600 px-1 py-2.5 text-center" style={{width:44}}>↕</th>
                            <th className="border border-indigo-600 px-2 py-2.5 text-center" style={{width:30}}>🗑</th>
                          </tr>
                        </thead>
                        <tbody>
                          {partBItemRows.map((row, idx) => {
                            const amt = rowAmt(row);
                            if (row.rowType === "section") {
                              return (
                                <tr key={row.uid} className="group bg-indigo-50">
                                  <td colSpan={9} className="border border-indigo-200 px-3 py-2">
                                    <div className="flex items-center gap-3">
                                      <span className="whitespace-nowrap text-[10px] font-black uppercase tracking-widest text-indigo-700">Section</span>
                                      <input
                                        value={row.desc}
                                        onChange={(event) => updatePartBRow(row.uid, "desc", event.target.value)}
                                        placeholder="Enter section heading"
                                        className="w-full rounded border border-indigo-200 bg-white px-3 py-1.5 text-sm font-bold text-indigo-950 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                                      />
                                    </div>
                                  </td>
                                  <td className="border border-indigo-200 px-1 py-1 text-center">
                                    <div className="flex flex-col items-center gap-0.5">
                                      <button type="button" onClick={() => movePartBRow(row.uid, "up")} disabled={idx === 0}
                                        className="text-slate-400 hover:text-indigo-600 disabled:opacity-20 disabled:cursor-not-allowed text-sm leading-none" title="Move up">▲</button>
                                      <button type="button" onClick={() => movePartBRow(row.uid, "down")} disabled={idx === partBItemRows.length - 1}
                                        className="text-slate-400 hover:text-indigo-600 disabled:opacity-20 disabled:cursor-not-allowed text-sm leading-none" title="Move down">▼</button>
                                    </div>
                                  </td>
                                  <td className="border border-indigo-200 px-1 py-1 text-center">
                                    <button type="button" onClick={() => deletePartBRow(row.uid)}
                                      className="text-slate-400 transition-colors hover:text-red-600" title="Remove section">×</button>
                                  </td>
                                </tr>
                              );
                            }
                            return (
                              <tr key={row.uid} className="group hover:bg-indigo-50 transition-colors" style={{ background: idx % 2 === 0 ? "#fff" : "#f8fafc" }}>
                                <td className="border border-slate-100 px-1 py-1 text-center font-bold text-black">{row.slNo}</td>
                                <td className="border border-slate-100 px-1 py-1">
                                  <input value={row.itemCode} onChange={(e) => updatePartBRow(row.uid,"itemCode",e.target.value)}
                                    className="w-full border border-slate-200 rounded px-1 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-300 font-mono text-black" />
                                </td>
                                <td className="border border-slate-100 px-1 py-1">
                                  <input value={row.desc} list="quotation-item-name-options" autoComplete="off"
                                    onChange={(e) => updatePartBRow(row.uid,"desc",e.target.value)}
                                    className="w-full border border-slate-200 rounded px-1 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-300 text-black" />
                                </td>
                                <td className="border border-slate-100 px-1 py-1" style={{minWidth:220}}>
                                  <input value={row.additionalColumn} onChange={(e) => updatePartBRow(row.uid,"additionalColumn",e.target.value)}
                                    className="w-full border border-slate-200 rounded px-1 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-300 text-black" />
                                </td>
                                <td className="border border-slate-100 px-1 py-1">
                                  <input value={row.size} onChange={(e) => updatePartBRow(row.uid,"size",e.target.value)}
                                    className="w-full border border-slate-200 rounded px-1 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-300 text-black" />
                                </td>
                                <td className="border border-slate-100 px-1 py-1">
                                  <input value={row.hsn} onChange={(e) => updatePartBRow(row.uid,"hsn",e.target.value)}
                                    className="w-full border border-slate-200 rounded px-1 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-300 font-mono text-center text-black" />
                                </td>
                                <td className="border border-slate-100 px-1 py-1">
                                  <input type="number" min={0} value={row.qty} onChange={(e) => updatePartBRow(row.uid,"qty",e.target.value)}
                                    className="w-full border border-slate-200 rounded px-1 py-0.5 text-center text-xs focus:outline-none focus:ring-1 focus:ring-indigo-300 font-semibold text-black" />
                                </td>
                                <td className="border border-slate-100 px-1 py-1">
                                  <input type="number" min={0} value={row.rate} onChange={(e) => updatePartBRow(row.uid,"rate",e.target.value)}
                                    className="w-full border border-slate-200 rounded px-1 py-0.5 text-right text-xs focus:outline-none focus:ring-1 focus:ring-indigo-300 font-mono text-black" />
                                </td>
                                <td className="border border-slate-100 px-2 py-1.5 text-right font-mono font-bold text-black">
                                  {amt !== null ? <span>{fmt(amt)}</span> : <span className="font-normal">—</span>}
                                </td>
                                <td className="border border-slate-100 px-1 py-1 text-center">
                                  <div className="flex flex-col items-center gap-0.5">
                                    <button type="button" onClick={() => movePartBRow(row.uid, "up")} disabled={idx === 0}
                                      className="text-slate-400 hover:text-indigo-600 disabled:opacity-20 disabled:cursor-not-allowed text-xs leading-none">▲</button>
                                    <button type="button" onClick={() => movePartBRow(row.uid, "down")} disabled={idx === partBItemRows.length - 1}
                                      className="text-slate-400 hover:text-indigo-600 disabled:opacity-20 disabled:cursor-not-allowed text-xs leading-none">▼</button>
                                  </div>
                                </td>
                                <td className="border border-slate-100 px-1 py-1 text-center">
                                  <button onClick={() => deletePartBRow(row.uid)}
                                    className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition-all text-sm leading-none">✕</button>
                                </td>
                              </tr>
                            );
                          }).reduce<React.ReactNode[]>((acc, rowEl, idx) => {
                            acc.push(rowEl);
                            const row = partBItemRows[idx];
                            const nextRow = partBItemRows[idx + 1];
                            if (row.rowType === "item" && (!nextRow || nextRow.rowType === "section")) {
                              acc.push(
                                <tr key={`insert-b-after-${row.uid}`} className="bg-slate-50/50">
                                  <td colSpan={11} className="border border-dashed border-slate-200 px-3 py-1 text-center">
                                    <button type="button" onClick={() => insertPartBRowAfter(idx)}
                                      className="text-[10px] font-bold text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50 px-3 py-0.5 rounded transition-colors">
                                      + Add Row
                                    </button>
                                  </td>
                                </tr>
                              );
                            }
                            return acc;
                          }, [])}
                        </tbody>
                      </table>
                    </div>

                    {/* Part B Add buttons */}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-indigo-100 bg-indigo-50/50 px-4 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <button onClick={addPartBRow}
                          className="flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-dashed border-indigo-300 text-indigo-600 hover:border-indigo-500 hover:bg-indigo-50 text-xs font-bold transition-all active:scale-95">
                          <span className="text-base leading-none">+</span>
                          Add More Item (B)
                        </button>
                        <button onClick={addPartBSection}
                          className="flex items-center gap-2 rounded-lg border-2 border-dashed border-violet-300 px-4 py-2 text-xs font-bold text-violet-700 transition-all hover:border-violet-500 hover:bg-violet-50 active:scale-95">
                          <span className="text-base leading-none">+</span>
                          Add Section (B)
                        </button>
                      </div>
                      <span className="text-xs text-indigo-500 font-semibold">
                        Part B: {partBItemCount} item{partBItemCount !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </>
                )}

                {/* ── Totals ── */}
                <div className="border-t-2 border-slate-300">
                  {/* Part A Totals — new order:
                      TOTAL AMOUNT → DISCOUNT% → SPECIAL DISCOUNT → TOTAL AFTER DISCOUNT → SEASONAL DISCOUNT → FINAL TOTAL (only if seasonal) */}
                  <div className="flex items-center justify-between border-b border-slate-200 bg-yellow-50 px-6 py-2 font-bold text-yellow-900">
                    <span className="text-xs font-semibold tracking-wide">TOTAL AMOUNT{partBEnabled ? " (A)" : ""}</span>
                    <span className="font-mono font-bold">₹ {fmt(grossA)}</span>
                  </div>
                  {Number(discountPercentA) > 0 && (
                    <div className="flex items-center justify-between border-b border-slate-200 bg-orange-50 px-6 py-2 text-orange-800">
                      <span className="text-xs font-semibold tracking-wide">DISCOUNT {discountPercentA}%</span>
                      <span className="font-mono font-bold">₹ {fmt(discountAmountA)}</span>
                    </div>
                  )}
                  {specialEnabled && (
                    <div className="flex items-center justify-between gap-4 border-b border-slate-200 bg-orange-50 px-6 py-2 text-orange-800">
                      <label htmlFor="special-discount-amount" className="text-xs font-semibold tracking-wide">SPECIAL DISCOUNT</label>
                      <div className="flex items-center gap-2">
                        <span className="font-bold">₹</span>
                        <input id="special-discount-amount" type="number" min="0" step="0.01" value={specialDiscount}
                          onChange={(e) => setSpecialDiscount(e.target.value)} placeholder="Enter amount"
                          className="w-36 rounded border border-orange-300 bg-white px-3 py-1.5 text-right font-mono text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-300" />
                      </div>
                    </div>
                  )}
                  {/* TOTAL AFTER DISCOUNT — (A) tab jab Part B enabled ho aur seasonal nahi (source of A amount) */}
                  {(Number(discountPercentA) > 0 || specialEnabled || seasonalEnabled) && (
                    <div className="flex items-center justify-between border-b border-slate-200 bg-orange-100 px-6 py-2 font-bold text-orange-900">
                      <span className="text-xs font-semibold tracking-wide">
                        TOTAL AFTER DISCOUNT{(partBEnabled && !seasonalEnabled) ? " (A)" : ""}
                      </span>
                      <span className="font-mono font-bold">₹ {fmt(afterDiscountA)}</span>
                    </div>
                  )}
                  {seasonalEnabled && (
                    <div className="flex items-center justify-between gap-4 border-b border-slate-200 bg-orange-50 px-6 py-2 text-orange-800">
                      <label htmlFor="seasonal-discount-amount" className="text-xs font-semibold tracking-wide">SEASONAL DISCOUNT</label>
                      <div className="flex items-center gap-2">
                        <span className="font-bold">₹</span>
                        <input id="seasonal-discount-amount" type="number" min="0" step="0.01" value={seasonalDiscount}
                          onChange={(e) => setSeasonalDiscount(e.target.value)} placeholder="Enter amount"
                          className="w-36 rounded border border-orange-300 bg-white px-3 py-1.5 text-right font-mono text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-300" />
                      </div>
                    </div>
                  )}
                  {seasonalEnabled && (
                    <div className="flex items-center justify-between border-b border-slate-200 bg-red-100 px-6 py-2 font-bold text-red-900">
                      <span className="text-xs font-semibold tracking-wide">FINAL TOTAL{partBEnabled ? " (A)" : ""}</span>
                      <span className="font-mono font-bold">₹ {fmt(finalTotalA)}</span>
                    </div>
                  )}

                  {/* Part B Totals — only when enabled */}
                  {partBEnabled && (
                    <>
                      <div className="flex items-center justify-between border-b border-indigo-200 bg-indigo-50 px-6 py-2 font-bold text-indigo-900 mt-0.5">
                        <span className="text-xs font-semibold tracking-wide">TOTAL AMOUNT{Number(discountPercentB) > 0 ? "" : " (B)"}</span>
                        <span className="font-mono font-bold">₹ {fmt(grossB)}</span>
                      </div>
                      {Number(discountPercentB) > 0 && (
                        <>
                          <div className="flex items-center justify-between border-b border-indigo-200 bg-indigo-50/70 px-6 py-2 text-indigo-800">
                            <span className="text-xs font-semibold tracking-wide">DISCOUNT {discountPercentB}%</span>
                            <span className="font-mono font-bold">₹ {fmt(discountAmountB)}</span>
                          </div>
                          <div className="flex items-center justify-between border-b border-indigo-200 bg-indigo-100 px-6 py-2 font-bold text-indigo-900">
                            <span className="text-xs font-semibold tracking-wide">TOTAL AFTER DISCOUNT (B)</span>
                            <span className="font-mono font-bold">₹ {fmt(afterDiscountB)}</span>
                          </div>
                        </>
                      )}
                      <div className="flex items-center justify-between border-b border-slate-300 bg-slate-100 px-6 py-2 font-bold text-slate-900 mt-0.5">
                        <span className="text-xs font-semibold tracking-wide">TOTAL AMOUNT (A+B)</span>
                        <span className="font-mono font-bold">₹ {fmt(combinedAfterDiscount)}</span>
                      </div>
                    </>
                  )}

                  {/* Combined: Transportation, Packing, GST, Grand Total */}
                  <div className="flex items-center justify-between gap-4 border-b border-slate-200 bg-cyan-50 px-6 py-2 text-cyan-900">
                    <label htmlFor="transportation-charges" className="text-xs font-semibold tracking-wide">TRANSPORTATION CHARGES</label>
                    <div className="flex items-center gap-2">
                      <span className="font-bold">₹</span>
                      <input
                        id="transportation-charges"
                        type="number"
                        min="0"
                        step="0.01"
                        value={transportationCharges}
                        onChange={(event) => setTransportationCharges(event.target.value)}
                        placeholder="As Per Actuals"
                        className="w-36 rounded border border-cyan-300 bg-white px-3 py-1.5 text-right font-mono text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-300"
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-4 border-b border-slate-200 bg-cyan-50 px-6 py-2 text-cyan-900">
                    <label htmlFor="packing-charges" className="text-xs font-semibold tracking-wide">PACKING CHARGES</label>
                    <div className="flex items-center gap-2">
                      <span className="font-bold">₹</span>
                      <input
                        id="packing-charges"
                        type="number"
                        min="0"
                        step="0.01"
                        value={packingCharges}
                        onChange={(event) => setPackingCharges(event.target.value)}
                        placeholder="As Per Actuals"
                        className="w-36 rounded border border-cyan-300 bg-white px-3 py-1.5 text-right font-mono text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-300"
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between border-b border-slate-200 bg-cyan-100 px-6 py-2 font-bold text-cyan-950">
                    <span className="text-xs font-semibold tracking-wide">TAXABLE VALUE</span>
                    <span className="font-mono font-bold">₹ {fmt(taxableAmount)}</span>
                  </div>
                  {gstEnabled && (
                    <>
                      <div className="flex items-center justify-between border-b border-slate-200 bg-red-50 px-6 py-2 text-red-700">
                        <span className="text-xs font-semibold tracking-wide">GST @ 18%</span>
                        <span className="font-mono font-bold">₹ {fmt(gst)}</span>
                      </div>
                      <div className="flex items-center justify-between border-b border-slate-200 bg-green-600 px-6 py-2 text-sm font-bold text-white">
                        <span className="text-xs font-semibold tracking-wide">GRAND TOTAL</span>
                        <span className="font-mono font-bold">₹ {fmt(grandTotal)}</span>
                      </div>
                    </>
                  )}
                </div>

              </div>
            )}

          </div>
        </div>

        {/* ── BOTTOM BAR ── */}
        <div className="flex-shrink-0 bg-white border-t border-slate-200 px-6 py-3 flex items-center justify-between">
          <p className="text-xs text-slate-500">
            {step === 2 && (
              <><strong className="text-slate-700">{itemCount}</strong> items &nbsp;·&nbsp;
              Grand Total: <strong className="text-green-700 text-sm">₹ {fmt(grandTotal)}</strong></>
            )}
            {step === 1 && <span className="text-blue-600 font-semibold">Step 1 of 2 — Fill party details then click Next</span>}
          </p>
          <div className="flex gap-3 items-center flex-wrap justify-end">
            {/* Download buttons in bottom bar on step 2 */}
            {step === 2 && (
              <QuotationDownload
                quotation={initialData ?? undefined}
                partyName={partyName}
                partyAddress={partyAddress}
                partyGST={partyGST}
                attention={attention}
                quotationNo={quotationNo}
                date={date}
                subject={subject}
                rows={itemRows.map((r) => ({
                  rowType: r.rowType, slNo: r.slNo, itemCode: r.itemCode, desc: r.desc,
                  size: r.size, hsn: r.hsn, qty: r.qty,
                  additionalColumn: r.additionalColumn, rate: r.rate,
                  amt: rowAmt(r),
                  section: r.rowType === "section" ? r.desc : undefined,
                }))}
                gross={grossA}
                discounts={{
                  seasonal: { enabled: seasonalEnabled, amount: seasonalAmount },
                  special: { enabled: specialEnabled, amount: specialAmount },
                  legacyAmount: 0,
                  transportationAmount,
                  packingAmount,
                  discountPercentA: Math.max(0, Number(discountPercentA) || 0),
                  partBEnabled,
                  discountPercentB: partBEnabled ? Math.max(0, Number(discountPercentB) || 0) : 0,
                }}
                afterDiscount={combinedAfterDiscount}
                gst={gst}
                grandTotal={grandTotal}
                partBRows={partBEnabled ? partBItemRows.map((r) => ({
                  rowType: r.rowType, slNo: r.slNo, itemCode: r.itemCode, desc: r.desc,
                  size: r.size, hsn: r.hsn, qty: r.qty,
                  additionalColumn: r.additionalColumn, rate: r.rate,
                  amt: rowAmt(r),
                  section: r.rowType === "section" ? r.desc : undefined,
                })) : undefined}
                grossB={partBEnabled ? grossB : undefined}
                afterDiscountB={partBEnabled ? afterDiscountB : undefined}
              />
            )}
            <button onClick={onClose}
              className="px-5 py-2 rounded-lg border border-slate-200 text-slate-600 text-sm hover:bg-slate-50 transition-colors">
              Cancel
            </button>
            {step === 1 && (
              <button onClick={goToStep2}
                className="px-6 py-2 rounded-lg text-white text-sm font-bold shadow hover:brightness-110 active:scale-95 transition-all"
                style={{ background:"linear-gradient(135deg,#0f172a,#1e3a5f,#2563eb)" }}>
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
