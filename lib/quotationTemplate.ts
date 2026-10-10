// Quotation Excel template export & import utilities
import type { SavedRowState } from "@/context/QuotationContext";
import type { QuotationDiscounts } from "@/lib/quotationAudit";

// 13 columns. Dimensions (MM/INCH, L, B, H, B/S) drive SIZE + Calculated Rate
// on import. Leave them blank + fill SIZE directly for a "STD"/manual size.
const ITEM_HEADERS = ["SL NO", "ITEM CODE", "ITEM NAME", "ADDITIONAL DESCRIPTION", "MM/INCH", "L", "B", "H", "B/S", "SIZE", "HSN CODE", "QTY", "RATE"];
const NCOLS = 13;        // total columns
const LAST_COL = NCOLS - 1; // 12

// ── Pure derived-value helpers (mirror QuotationModal) ──────────────────────
function tplClean(v?: string): string {
  const s = (v ?? "").trim();
  return s === "null" || s === "undefined" ? "" : s;
}

// Compose the SIZE string from unit + L/B/H/B/S (same rules as the modal).
// SIZE = "STD" only when BOTH unit and L are blank.
export function tplComposeSize(unit: string, dimL?: string, dimB?: string, dimH?: string, dimBS?: string): string {
  const u = unit === "INCH" ? "INCH" : (unit === "MM" ? "MM" : "");
  const suffix = u === "INCH" ? "\"" : "";
  const l = tplClean(dimL);
  if (!u && l === "") return "STD";
  const lbh = [dimL, dimB, dimH].map(tplClean).filter((v) => v !== "");
  const bs = tplClean(dimBS);
  const parts = lbh.map((v) => v + suffix);
  let size = parts.join("X");
  if (bs !== "" && bs !== "0") size += "+" + bs + suffix;
  return size;
}

// Calculated Rate (same rules as the modal):
//  - unit+L blank (STD) → standard rate.
//  - L present → round(L in feet, 0.25 cutoff) * perFootRate.
//  - missing rate → "".
export function tplComputeCalcRate(
  unit: string, dimL: string | undefined, perFootRate: string, stdRate: string
): string {
  const u = unit === "INCH" ? "INCH" : "MM";
  const l = Number(tplClean(dimL));
  const hasL = Number.isFinite(l) && l > 0;
  const hasUnit = unit === "MM" || unit === "INCH";
  if (!hasUnit && !hasL) {
    const s = Number((stdRate ?? "").trim());
    return Number.isFinite(s) && s > 0 ? String(s) : "";
  }
  if (!hasL) return "";
  const pf = Number((perFootRate ?? "").trim());
  if (!Number.isFinite(pf) || pf <= 0) return "";
  const feet = u === "MM" ? l / 304.8 : l / 12;
  const frac = feet - Math.floor(feet);
  const roundedFeet = frac <= 0.25 ? Math.floor(feet) : Math.ceil(feet);
  return String(roundedFeet * pf);
}

// Per-item rate lookup from the Item Names list (trimmed, case-insensitive).
export type ItemRateLookup = { item_name: string; rate?: number | null; standard_rate?: number | null };
function lookupRates(desc: string, opts: ItemRateLookup[]): { rate: string; std: string } {
  const key = (desc ?? "").trim().toLowerCase();
  if (!key) return { rate: "", std: "" };
  const m = opts.find((o) => o.item_name.trim().toLowerCase() === key);
  const rate = m?.rate !== undefined && m?.rate !== null && Number.isFinite(Number(m.rate)) ? String(m.rate) : "";
  const std = m?.standard_rate !== undefined && m?.standard_rate !== null && Number.isFinite(Number(m.standard_rate)) ? String(m.standard_rate) : "";
  return { rate, std };
}

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

  const blankRowCells = () => Array(NCOLS).fill(sc("", blankBorder));
  // Totals live in the right-hand columns. Label spans cols 9-11, value in col 12.
  const TOT_LABEL_START = 9;
  const pushTot = (label: string, style: object, isAuto = false) => {
    const rowArr: CellVal[] = Array(NCOLS).fill("");
    rowArr[TOT_LABEL_START] = sc(label, style);
    rowArr[TOT_LABEL_START + 1] = sc("", style);
    rowArr[TOT_LABEL_START + 2] = sc("", style);
    rowArr[LAST_COL] = isAuto ? sc("(auto)", totAuto) : sc("", totInput);
    data.push(rowArr);
    merges.push({ s: { r, c: TOT_LABEL_START }, e: { r, c: TOT_LABEL_START + 2 } }); r++;
  };
  const addItemBlock = (secStyle: object, prefix: string, secCount: number) => {
    for (let s = 1; s <= secCount; s++) {
      data.push(Array(NCOLS).fill(null).map((_, i) => sc(i === 0 ? `${prefix} ${s} (RENAME OR DELETE)` : "", secStyle)));
      merges.push({ s: { r, c: 0 }, e: { r, c: LAST_COL } }); r++;
      for (let i = 0; i < 8; i++) { data.push(blankRowCells()); r++; }
    }
  };

  // ── Title ──
  data.push([sc("PRESTAIR QUOTATION IMPORT TEMPLATE", { font: { bold: true, sz: 14, color: { rgb: "1F4E79" } } })]);
  merges.push({ s: { r, c: 0 }, e: { r, c: LAST_COL } }); r++;
  data.push([sc("Fill YELLOW cells only. SL NO auto-fills on import — leave blank. For a dimensioned item fill MM/INCH + L (B/H/B-S optional) — SIZE & CALC. RATE compute on import. For a standard item leave MM/INCH & L blank — SIZE becomes STD. Part B section blank rakho agar use nahi karna.", noteStyle)]);
  merges.push({ s: { r, c: 0 }, e: { r, c: LAST_COL } }); r++;
  data.push([]); r++;

  // ── Header fields (labels in col 0, values cols 1-3; right labels col 9, values 10-12) ──
  const RLABEL = 9, RVAL = 10;
  const metaRow = (leftLabel: string, rightLabel: string, rightNote = false) => {
    const rowArr: CellVal[] = Array(NCOLS).fill("");
    rowArr[0] = sc(leftLabel, labelStyle);
    rowArr[1] = sc("", inputStyle); rowArr[2] = sc("", inputStyle); rowArr[3] = sc("", inputStyle);
    if (rightLabel) {
      rowArr[RLABEL] = sc(rightLabel, labelStyle);
      rowArr[RVAL] = rightNote ? sc("(auto: today on import)", noteStyle) : sc("", inputStyle);
      rowArr[RVAL + 1] = rightNote ? "" : sc("", inputStyle);
      rowArr[RVAL + 2] = rightNote ? "" : sc("", inputStyle);
    }
    data.push(rowArr);
    merges.push({ s: { r, c: 1 }, e: { r, c: 3 } });
    if (rightLabel) merges.push({ s: { r, c: RVAL }, e: { r, c: LAST_COL } });
    r++;
  };
  metaRow("USER NAME:", "DATE:", true);
  metaRow("CLIENT NAME (M/S):", "REQUESTER:");
  metaRow("ADDRESS:", "GST NO.:");
  metaRow("KIND ATTENTION:", "");
  // Subject spans full width value
  {
    const rowArr: CellVal[] = Array(NCOLS).fill("");
    rowArr[0] = sc("SUBJECT:", labelStyle);
    rowArr[1] = sc("", inputStyle);
    data.push(rowArr);
    merges.push({ s: { r, c: 1 }, e: { r, c: LAST_COL } }); r++;
  }
  data.push([]); r++;

  // ── PART A ──
  data.push(Array(NCOLS).fill(null).map((_, i) => sc(i === 0 ? "PART - A" : "", partHeadA)));
  merges.push({ s: { r, c: 0 }, e: { r, c: LAST_COL } }); r++;
  data.push([sc("SL NO\n(auto — leave blank)", thGrey), ...ITEM_HEADERS.slice(1).map((h) => sc(h, th))]); r++;
  addItemBlock(secStyleA, "SECTION", 2);
  data.push([]); r++;

  // ── PART B ──
  data.push(Array(NCOLS).fill(null).map((_, i) => sc(i === 0 ? "PART - B  (Leave entire section blank if not used)" : "", partHeadB)));
  merges.push({ s: { r, c: 0 }, e: { r, c: LAST_COL } }); r++;
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
  {
    const rowArr: CellVal[] = Array(NCOLS).fill("");
    rowArr[TOT_LABEL_START] = sc("GRAND TOTAL", totGold);
    rowArr[TOT_LABEL_START + 1] = sc("", totGold);
    rowArr[TOT_LABEL_START + 2] = sc("", totGold);
    rowArr[LAST_COL] = sc("(auto)", totAuto);
    data.push(rowArr);
    merges.push({ s: { r, c: TOT_LABEL_START }, e: { r, c: TOT_LABEL_START + 2 } }); r++;
  }
  data.push([]); r++;
  data.push([sc("NOTE: Yellow = fill karo. (auto) = import par calculate hoga. SL NO blank rakho. MM/INCH + L bharo to SIZE & CALC. RATE auto bante hain; blank chhodo to SIZE = STD. Part B blank rakho agar use nahi karna.", noteStyle)]);
  merges.push({ s: { r, c: 0 }, e: { r, c: LAST_COL } }); r++;

  const ws = XLSX.utils.aoa_to_sheet(data);
  ws["!merges"] = merges;
  ws["!cols"] = [
    { wch: 10 },  // SL NO
    { wch: 12 },  // ITEM CODE
    { wch: 26 },  // ITEM NAME
    { wch: 40 },  // ADDITIONAL DESCRIPTION
    { wch: 9 },   // MM/INCH
    { wch: 7 },   // L
    { wch: 7 },   // B
    { wch: 7 },   // H
    { wch: 7 },   // B/S
    { wch: 16 },  // SIZE
    { wch: 12 },  // HSN CODE
    { wch: 7 },   // QTY
    { wch: 14 },  // RATE
  ];
  XLSX.utils.book_append_sheet(wb, ws, "Quotation Template");
  XLSX.writeFile(wb, "Prestair_Quotation_Template.xlsx");
}

// ── Import helpers ────────────────────────────────────────────────────────────
function parseRows(
  rawData: (string | number | undefined)[][],
  startIdx: number,
  endIdx: number,
  itemRates: ItemRateLookup[]
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

    // 13-column layout:
    // 0 SL NO | 1 CODE | 2 NAME | 3 ADD-DESC | 4 MM/INCH | 5 L | 6 B | 7 H | 8 B/S | 9 SIZE | 10 HSN | 11 QTY | 12 RATE
    const itemCode = cv[1] || "";
    const itemName = cv[2] || "";
    const addDesc  = cv[3] || "";
    const rawUnit  = (cv[4] || "").toUpperCase();
    const unit     = rawUnit === "INCH" ? "INCH" : (rawUnit === "MM" ? "MM" : "");
    const dimL     = cv[5] || "";
    const dimB     = cv[6] || "";
    const dimH     = cv[7] || "";
    const dimBS    = cv[8] || "";
    const sizeCell = cv[9] || "";
    const hsn      = cv[10] || "";
    const qty      = Number(cv[11]) || 1;
    // RATE: ignore non-numeric / blank → null (so the amount is simply NQ and
    // totals are unaffected, instead of producing NaN).
    const rateNum  = Number(cv[12]);
    const rate     = cv[12] !== "" && Number.isFinite(rateNum) && rateNum >= 0 ? rateNum : null;
    if (!itemCode && !itemName && !addDesc) continue;
    slNo++;

    // Dimensions present? → compute SIZE from them; else use the SIZE cell as typed.
    const hasDimInputs = !!(unit || dimL.trim() || dimB.trim() || dimH.trim() || dimBS.trim());
    const size = hasDimInputs ? tplComposeSize(unit, dimL, dimB, dimH, dimBS) : (sizeCell || "STD");

    // Snapshot per-item rates from the Item Names table, then compute CALC. RATE.
    const { rate: perFoot, std } = lookupRates(itemName, itemRates);
    const calcRate = tplComputeCalcRate(unit, dimL, perFoot, std);

    rows.push({
      id: itemCode || `item-${slNo}`, rowType: "item", desc: itemName, size, hsn,
      section: currentSection || "Custom", qty, additionalColumn: addDesc,
      discount: 0, discountIsPerUnit: false, rate, amt: rate !== null ? qty * rate : null, checked: true,
      // New snapshot fields so the imported quotation behaves like a modal-made one.
      mmInch: unit === "INCH" ? "INCH" : (unit === "MM" ? "MM" : undefined),
      dimL: dimL || undefined, dimB: dimB || undefined, dimH: dimH || undefined, dimBS: dimBS || undefined,
      itemRate: perFoot || undefined, stdRate: std || undefined, calcRate: calcRate || undefined,
    });
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

export async function importTemplate(file: File, itemRates: ItemRateLookup[] = []): Promise<ImportResult> {
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
    // Right-hand labels sit in col 9, their value starts col 10 (13-col layout).
    const right = String(row[9] || "").toUpperCase().trim();
    const rightVal = String(row[10] || "").trim();
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
    // Totals labels sit in col 9, value in col 12 (13-col layout).
    const label = String(row[9] || row[0] || "").toUpperCase().trim();
    const val = Number(row[12] ?? row[11] ?? 0) || 0;
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
      // Part B header is the item-header row that appears AFTER the "PART - B" banner
      else if (partBHeaderIdx === -1 && partBBannerIdx > -1 && i > partBBannerIdx) partBHeaderIdx = i;
    }
  }
  if (partAHeaderIdx === -1) throw new Error("Could not find header row (ITEM CODE / ITEM NAME).");

  // ── Find totals start ─────────────────────────────────────────────────────
  let totalsStartIdx = rawData.length;
  for (let i = partAHeaderIdx + 1; i < rawData.length; i++) {
    const row = rawData[i];
    if (!row) continue;
    const cLabel = String(row[9] || "").toUpperCase().trim();
    if (cLabel.includes("TOTAL AMOUNT (A)") || cLabel.includes("TOTAL AMOUNT A")) { totalsStartIdx = i; break; }
  }

  // ── Parse Part A rows ─────────────────────────────────────────────────────
  const partAEnd = partBHeaderIdx > -1 ? partBBannerIdx : totalsStartIdx;
  const rows = parseRows(rawData, partAHeaderIdx + 1, partAEnd, itemRates);

  // ── Parse Part B rows ─────────────────────────────────────────────────────
  let partBRows: SavedRowState[] = [];
  if (partBHeaderIdx > -1) {
    partBRows = parseRows(rawData, partBHeaderIdx + 1, totalsStartIdx, itemRates);
  }

  if (rows.filter((r) => r.rowType === "item").length === 0) {
    throw new Error("No items found in Part A. Fill item rows under section headers.");
  }

  // ── Calculate totals ──────────────────────────────────────────────────────
  const gross         = rows.reduce((s, r) => s + (r.amt ?? 0), 0);
  const grossB        = partBRows.reduce((s, r) => s + (r.amt ?? 0), 0);
  const partBEnabled  = partBRows.filter((r) => r.rowType === "item").length > 0;

  // New rule: afterDiscountA excludes seasonal; finalTotalA = afterDiscountA - seasonal.
  const discountAmtA   = Math.round(gross * discountPercentA / 100);
  const afterDiscountA = Math.max(0, gross - discountAmtA - specialDiscount); // excludes seasonal
  const finalTotalA    = Math.max(0, afterDiscountA - seasonalDiscount);       // after seasonal
  const effectiveA     = seasonalDiscount > 0 ? finalTotalA : afterDiscountA;
  const discountAmtB   = Math.round(grossB * discountPercentB / 100);
  const afterDiscountB = Math.max(0, grossB - discountAmtB);
  const combined       = effectiveA + (partBEnabled ? afterDiscountB : 0);
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
    rows,
    // If Part B has NO items, return an empty array so it is never imported /
    // shown anywhere (view, Excel, print). Leftover empty section headers are
    // dropped too.
    partBRows: partBEnabled ? partBRows : [],
    gross, discounts,
    afterDiscount: combined, gst, grandTotal,
    userName, partyName, partyAddress, partyGST, attention, subject, requester,
  };
}
