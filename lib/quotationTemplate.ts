// Quotation Excel template export & import utilities
import type { SavedRowState } from "@/context/QuotationContext";
import type { QuotationDiscounts } from "@/lib/quotationAudit";

const ITEM_HEADERS = ["SL NO", "ITEM CODE", "ITEM NAME", "ADDITIONAL DESCRIPTION", "SIZE", "HSN CODE", "QTY", "RATE"];

// ── Export blank template ─────────────────────────────────────────────────────
export async function exportTemplate() {
  const XLSX = await import("xlsx-js-style");
  const wb = XLSX.utils.book_new();

  type CellVal = string | number | { v: string | number; s: object };
  const data: CellVal[][] = [];
  const merges: { s: { r: number; c: number }; e: { r: number; c: number } }[] = [];
  let r = 0;
  const sc = (v: string | number, s: object): { v: string | number; s: object } => ({ v, s });

  const labelStyle = { font: { bold: true, sz: 9, color: { rgb: "1F4E79" } } };
  const inputStyle = { font: { sz: 10 }, fill: { fgColor: { rgb: "FFFDE7" } }, border: { bottom: { style: "thin", color: { rgb: "AAAAAA" } } } };
  const noteStyle  = { font: { sz: 8, italic: true, color: { rgb: "777777" } } };
  const th = { font: { bold: true, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "1F4E79" } }, alignment: { horizontal: "center", wrapText: true }, border: { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } } };
  const thGrey = { font: { bold: true, color: { rgb: "FFFFFF" }, italic: true }, fill: { fgColor: { rgb: "888888" } }, alignment: { horizontal: "center", wrapText: true }, border: { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } } };
  const secStyleA = { font: { bold: true, sz: 10, color: { rgb: "1F4E79" } }, fill: { fgColor: { rgb: "DDEEFF" } }, alignment: { horizontal: "center" }, border: { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } } };
  const secStyleB = { font: { bold: true, sz: 10, color: { rgb: "4B0082" } }, fill: { fgColor: { rgb: "EDE7F6" } }, alignment: { horizontal: "center" }, border: { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } } };
  const blankBorder = { fill: { fgColor: { rgb: "FFFDE7" } }, border: { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } } };
  const partHeadA = { font: { bold: true, sz: 11, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "1E40AF" } }, alignment: { horizontal: "center" }, border: { top: { style: "medium" }, bottom: { style: "medium" }, left: { style: "medium" }, right: { style: "medium" } } };
  const partHeadB = { font: { bold: true, sz: 11, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "3C3C78" } }, alignment: { horizontal: "center" }, border: { top: { style: "medium" }, bottom: { style: "medium" }, left: { style: "medium" }, right: { style: "medium" } } };
  const totLabel = { font: { bold: true, sz: 10 }, fill: { fgColor: { rgb: "FFFFCC" } }, alignment: { horizontal: "center" }, border: { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } } };
  const totInput = { font: { bold: true, sz: 10 }, fill: { fgColor: { rgb: "FFF3CD" } }, alignment: { horizontal: "center" }, border: { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } } };
  const totAuto  = { font: { bold: true, sz: 10, color: { rgb: "888888" } }, fill: { fgColor: { rgb: "F0F0F0" } }, alignment: { horizontal: "center" }, border: { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } } };
  const totGold  = { font: { bold: true, sz: 11 }, fill: { fgColor: { rgb: "FFD700" } }, alignment: { horizontal: "center" }, border: { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } } };

  const blank8 = () => Array(8).fill(sc("", blankBorder));
  const pushTot = (label: string, style: object, isAuto = false) => {
    data.push(["", "", "", "", "", sc(label, style), sc("", style), isAuto ? sc("(auto)", totAuto) : sc("", totInput)]);
    merges.push({ s: { r, c: 5 }, e: { r, c: 6 } }); r++;
  };
  const addItemBlock = (secStyle: object, prefix: string, secCount: number) => {
    for (let s = 1; s <= secCount; s++) {
      data.push([sc(`${prefix} ${s} (RENAME OR DELETE)`, secStyle), sc("", secStyle), sc("", secStyle), sc("", secStyle), sc("", secStyle), sc("", secStyle), sc("", secStyle), sc("", secStyle)]);
      merges.push({ s: { r, c: 0 }, e: { r, c: 7 } }); r++;
      for (let i = 0; i < 8; i++) { data.push(blank8()); r++; }
    }
  };

  // ── Title ──
  data.push([sc("PRESTAIR QUOTATION IMPORT TEMPLATE", { font: { bold: true, sz: 14, color: { rgb: "1F4E79" } } }), "", "", "", "", "", "", ""]);
  merges.push({ s: { r, c: 0 }, e: { r, c: 7 } }); r++;
  data.push([sc("Fill YELLOW cells only. SL NO auto-fills on import — leave blank. Part B section blank rakho agar use nahi karna.", noteStyle), "", "", "", "", "", "", ""]);
  merges.push({ s: { r, c: 0 }, e: { r, c: 7 } }); r++;
  data.push([]); r++;

  // ── Header fields ──
  data.push([sc("USER NAME:", labelStyle), sc("", inputStyle), sc("", inputStyle), sc("", inputStyle), sc("DATE:", labelStyle), sc("(auto: today on import)", noteStyle), "", ""]);
  merges.push({ s: { r, c: 1 }, e: { r, c: 3 } }); merges.push({ s: { r, c: 5 }, e: { r, c: 7 } }); r++;
  data.push([sc("CLIENT NAME (M/S):", labelStyle), sc("", inputStyle), sc("", inputStyle), sc("", inputStyle), sc("REQUESTER:", labelStyle), sc("", inputStyle), sc("", inputStyle), sc("", inputStyle)]);
  merges.push({ s: { r, c: 1 }, e: { r, c: 3 } }); merges.push({ s: { r, c: 5 }, e: { r, c: 7 } }); r++;
  data.push([sc("ADDRESS:", labelStyle), sc("", inputStyle), sc("", inputStyle), sc("", inputStyle), sc("GST NO.:", labelStyle), sc("", inputStyle), sc("", inputStyle), sc("", inputStyle)]);
  merges.push({ s: { r, c: 1 }, e: { r, c: 3 } }); merges.push({ s: { r, c: 5 }, e: { r, c: 7 } }); r++;
  data.push([sc("KIND ATTENTION:", labelStyle), sc("", inputStyle), sc("", inputStyle), sc("", inputStyle), "", "", "", ""]);
  merges.push({ s: { r, c: 1 }, e: { r, c: 3 } }); r++;
  data.push([sc("SUBJECT:", labelStyle), sc("", inputStyle), sc("", inputStyle), sc("", inputStyle), sc("", inputStyle), sc("", inputStyle), sc("", inputStyle), sc("", inputStyle)]);
  merges.push({ s: { r, c: 1 }, e: { r, c: 7 } }); r++;
  data.push([]); r++;

  // ── PART A ──
  data.push([sc("PART - A", partHeadA), sc("", partHeadA), sc("", partHeadA), sc("", partHeadA), sc("", partHeadA), sc("", partHeadA), sc("", partHeadA), sc("", partHeadA)]);
  merges.push({ s: { r, c: 0 }, e: { r, c: 7 } }); r++;
  data.push([sc("SL NO\n(auto — leave blank)", thGrey), ...ITEM_HEADERS.slice(1).map((h) => sc(h, th))]); r++;
  addItemBlock(secStyleA, "SECTION", 2);
  data.push([]); r++;

  // ── PART B ──
  data.push(Array(8).fill(null).map((_, i) => sc(i === 0 ? "PART - B  (Leave entire section blank if not used)" : "", partHeadB)));
  merges.push({ s: { r, c: 0 }, e: { r, c: 7 } }); r++;
  data.push([sc("SL NO\n(auto — leave blank)", thGrey), ...ITEM_HEADERS.slice(1).map((h) => sc(h, th))]); r++;
  addItemBlock(secStyleB, "PART B - SECTION", 2);
  data.push([]); r++;

  // ── Totals ──
  pushTot("TOTAL AMOUNT (A)", totLabel, true);
  pushTot("DISCOUNT % (Part A) — enter number e.g. 10", totInput);
  pushTot("SPECIAL DISCOUNT (Part A)", totInput);
  pushTot("SEASONAL DISCOUNT (Part A)", totInput);
  pushTot("TOTAL AFTER DISCOUNT (A)", totLabel, true);
  data.push([]); r++;
  pushTot("TOTAL AMOUNT (B)  — auto if Part B items filled", totLabel, true);
  pushTot("DISCOUNT % (Part B) — enter number e.g. 5", totInput);
  pushTot("TOTAL AFTER DISCOUNT (B)", totLabel, true);
  data.push([]); r++;
  pushTot("TRANSPORTATION CHARGES", totInput);
  pushTot("PACKING CHARGES", totInput);
  pushTot("TAXABLE VALUE", totLabel, true);
  pushTot("GST 18%", totLabel, true);
  data.push(["", "", "", "", "", sc("GRAND TOTAL", totGold), sc("", totGold), sc("(auto)", totAuto)]);
  merges.push({ s: { r, c: 5 }, e: { r, c: 6 } }); r++;
  data.push([]); r++;
  data.push([sc("NOTE: Yellow = fill karo. (auto) = import par calculate hoga. SL NO blank rakho. Part B blank rakho agar use nahi karna.", noteStyle), "", "", "", "", "", "", ""]);
  merges.push({ s: { r, c: 0 }, e: { r, c: 7 } }); r++;

  const ws = XLSX.utils.aoa_to_sheet(data);
  ws["!merges"] = merges;
  ws["!cols"] = [{ wch: 22 }, { wch: 12 }, { wch: 28 }, { wch: 50 }, { wch: 14 }, { wch: 30 }, { wch: 8 }, { wch: 16 }];
  XLSX.utils.book_append_sheet(wb, ws, "Quotation Template");
  XLSX.writeFile(wb, "Prestair_Quotation_Template.xlsx");
}

// ── Import helpers ────────────────────────────────────────────────────────────
function parseRows(
  rawData: (string | number | undefined)[][],
  startIdx: number,
  endIdx: number
): SavedRowState[] {
  const rows: SavedRowState[] = [];
  let currentSection = "";
  let slNo = 0;

  for (let i = startIdx; i < endIdx; i++) {
    const row = rawData[i];
    if (!row || row.every((c) => !c && c !== 0)) continue;
    const cv = row.map((c) => (c !== undefined && c !== null) ? String(c).trim() : "");
    const firstCell = cv[0] || "";

    // Section row: first cell has text, rest empty
    const isSection = firstCell.length > 1
      && !firstCell.match(/^\d+$/)
      && cv.slice(1).every((c) => !c || c === firstCell);

    if (isSection) {
      if (rows.some((rr) => rr.rowType === "section" && rr.desc.toUpperCase() === firstCell.toUpperCase())) continue;
      currentSection = firstCell;
      rows.push({ id: `sec-${Date.now()}-${i}`, rowType: "section", desc: firstCell, size: "", hsn: "", section: firstCell, qty: 0, additionalColumn: "", discount: 0, discountIsPerUnit: true, rate: null, amt: null, checked: true });
      continue;
    }

    const itemCode = cv[1] || "";
    const itemName = cv[2] || "";
    const addDesc  = cv[3] || "";
    const size     = cv[4] || "";
    const hsn      = cv[5] || "";
    const qty      = Number(cv[6]) || 1;
    const rate     = cv[7] ? Number(cv[7]) : null;
    if (!itemCode && !itemName && !addDesc) continue;
    slNo++;
    rows.push({ id: itemCode || `item-${slNo}`, rowType: "item", desc: itemName, size, hsn, section: currentSection || "Custom", qty, additionalColumn: addDesc, discount: 0, discountIsPerUnit: false, rate, amt: rate !== null ? qty * rate : null, checked: true });
  }

  // Remove empty sections
  const out: SavedRowState[] = [];
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].rowType === "section") {
      const nextSec = rows.slice(i + 1).findIndex((r) => r.rowType === "section");
      const slice = nextSec === -1 ? rows.slice(i + 1) : rows.slice(i + 1, i + 1 + nextSec);
      if (slice.some((r) => r.rowType === "item")) out.push(rows[i]);
    } else {
      out.push(rows[i]);
    }
  }
  return out;
}

// ── Import Result type ────────────────────────────────────────────────────────
export type ImportResult = {
  rows: SavedRowState[];
  partBRows: SavedRowState[];
  gross: number;
  discounts: QuotationDiscounts;
  afterDiscount: number;
  gst: number;
  grandTotal: number;
  userName: string;
  partyName: string;
  partyAddress: string;
  partyGST: string;
  attention: string;
  subject: string;
  requester: string;
};

export async function importTemplate(file: File): Promise<ImportResult> {
  const XLSX = await import("xlsx");
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  if (!ws) throw new Error("No worksheet found in file");

  const rawData: (string | number | undefined)[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });

  // ── Metadata (first 20 rows) ──────────────────────────────────────────────
  let userName = "", partyName = "", partyAddress = "", partyGST = "", attention = "", subject = "", requester = "";
  for (let i = 0; i < Math.min(20, rawData.length); i++) {
    const row = rawData[i];
    if (!row) continue;
    const left = String(row[0] || "").toUpperCase().trim();
    const leftVal = String(row[1] || "").trim();
    const right = String(row[4] || "").toUpperCase().trim();
    const rightVal = String(row[5] || "").trim();
    if (left.includes("USER NAME"))                            userName     = leftVal;
    if (left.includes("CLIENT NAME") || left.includes("M/S")) partyName    = leftVal;
    if (left.includes("ADDRESS"))                              partyAddress = leftVal;
    if (left.includes("KIND ATTENTION"))                       attention    = leftVal;
    if (left.includes("SUBJECT"))                              subject      = leftVal;
    if (right.includes("REQUESTER"))                           requester    = rightVal;
    if (right.includes("GST NO") || right.includes("GST:"))   partyGST     = rightVal;
  }

  // ── Discount values (scan all rows) ──────────────────────────────────────
  let seasonalDiscount = 0, specialDiscount = 0, transportationAmt = 0, packingAmt = 0;
  let discountPercentA = 0, discountPercentB = 0;
  for (let i = 0; i < rawData.length; i++) {
    const row = rawData[i];
    if (!row) continue;
    const label = String(row[5] || row[0] || "").toUpperCase().trim();
    const val = Number(row[7] ?? row[6] ?? 0) || 0;
    if (label.includes("DISCOUNT % (PART A)") || label.includes("DISCOUNT % PART A"))    discountPercentA  = val;
    else if (label.includes("DISCOUNT % (PART B)") || label.includes("DISCOUNT % PART B")) discountPercentB = val;
    else if (label.includes("SEASONAL DISCOUNT"))  seasonalDiscount  = val;
    else if (label.includes("SPECIAL DISCOUNT"))   specialDiscount   = val;
    else if (label.includes("TRANSPORTATION"))      transportationAmt = val;
    else if (label.includes("PACKING"))             packingAmt        = val;
  }

  // ── Find PART A and PART B header rows ────────────────────────────────────
  let partAHeaderIdx = -1;  // row with ITEM CODE / ITEM NAME for Part A
  let partBHeaderIdx = -1;  // row with ITEM CODE / ITEM NAME for Part B
  let partBBannerIdx = -1;  // row with "PART - B" banner

  const isItemHeader = (row: (string | number | undefined)[]) =>
    row.some((c) => { const s = String(c || "").toUpperCase().trim(); return s === "ITEM CODE" || s === "ITEM NAME"; });

  for (let i = 0; i < rawData.length; i++) {
    const row = rawData[i];
    if (!row) continue;
    const c0 = String(row[0] || "").toUpperCase().trim();
    if (c0.includes("PART - B") || c0.includes("PART B")) partBBannerIdx = i;
    if (isItemHeader(row)) {
      if (partAHeaderIdx === -1) partAHeaderIdx = i;
      else if (partBHeaderIdx === -1 && i > (partBBannerIdx > -1 ? partBBannerIdx : 999)) partBHeaderIdx = i;
    }
  }
  if (partAHeaderIdx === -1) throw new Error("Could not find header row (ITEM CODE / ITEM NAME).");

  // ── Find totals start ─────────────────────────────────────────────────────
  let totalsStartIdx = rawData.length;
  for (let i = partAHeaderIdx + 1; i < rawData.length; i++) {
    const row = rawData[i];
    if (!row) continue;
    const c5 = String(row[5] || "").toUpperCase().trim();
    if (c5.includes("TOTAL AMOUNT (A)") || c5.includes("TOTAL AMOUNT A")) { totalsStartIdx = i; break; }
  }

  // ── Parse Part A rows ─────────────────────────────────────────────────────
  const partAEnd = partBHeaderIdx > -1 ? partBBannerIdx : totalsStartIdx;
  const rows = parseRows(rawData, partAHeaderIdx + 1, partAEnd);

  // ── Parse Part B rows ─────────────────────────────────────────────────────
  let partBRows: SavedRowState[] = [];
  if (partBHeaderIdx > -1) {
    partBRows = parseRows(rawData, partBHeaderIdx + 1, totalsStartIdx);
  }

  if (rows.filter((r) => r.rowType === "item").length === 0) {
    throw new Error("No items found in Part A. Fill item rows under section headers.");
  }

  // ── Calculate totals ──────────────────────────────────────────────────────
  const gross         = rows.reduce((s, r) => s + (r.amt ?? 0), 0);
  const grossB        = partBRows.reduce((s, r) => s + (r.amt ?? 0), 0);
  const partBEnabled  = partBRows.filter((r) => r.rowType === "item").length > 0;

  const discountAmtA   = Math.round(gross * discountPercentA / 100);
  const totalDiscountA = discountAmtA + seasonalDiscount + specialDiscount;
  const afterDiscountA = Math.max(0, gross - totalDiscountA);
  const discountAmtB   = Math.round(grossB * discountPercentB / 100);
  const afterDiscountB = Math.max(0, grossB - discountAmtB);
  const combined       = afterDiscountA + (partBEnabled ? afterDiscountB : 0);
  const taxable        = combined + transportationAmt + packingAmt;
  const gst            = Math.round(taxable * 0.18);
  const grandTotal     = taxable + gst;

  const discounts: QuotationDiscounts = {
    seasonal:             { enabled: seasonalDiscount > 0, amount: seasonalDiscount },
    special:              { enabled: specialDiscount > 0,  amount: specialDiscount },
    legacyAmount:         0,
    transportationAmount: transportationAmt,
    packingAmount:        packingAmt,
    discountPercentA,
    discountPercentB,
    partBEnabled,
    gstEnabled: true,
  };

  return {
    rows, partBRows, gross, discounts,
    afterDiscount: afterDiscountA, gst, grandTotal,
    userName, partyName, partyAddress, partyGST, attention, subject, requester,
  };
}
