// Quotation Excel template export & import utilities
import type { SavedRowState } from "@/context/QuotationContext";
import type { QuotationDiscounts } from "@/lib/quotationAudit";

const TEMPLATE_HEADERS = ["SL NO", "ITEM CODE", "ITEM NAME", "ADDITIONAL DESCRIPTION", "SIZE", "HSN CODE", "QTY", "RATE"];

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
  const inputStyle = { font: { sz: 10 }, border: { bottom: { style: "thin", color: { rgb: "AAAAAA" } } } };

  // Title
  data.push([sc("PRESTAIR QUOTATION TEMPLATE", { font: { bold: true, sz: 14, color: { rgb: "1F4E79" } } }), "", "", "", "", "", "", ""]);
  merges.push({ s: { r, c: 0 }, e: { r, c: 7 } }); r++;
  data.push([]); r++;

  // User-input fields
  data.push([sc("USER NAME:", labelStyle), sc("", inputStyle), "", "", sc("DATE:", labelStyle), sc("(auto: import date)", { font: { sz: 9, italic: true, color: { rgb: "999999" } } }), "", ""]);
  merges.push({ s: { r, c: 1 }, e: { r, c: 3 } }); r++;
  data.push([sc("CLIENT NAME (M/S):", labelStyle), sc("", inputStyle), "", "", "", "", "", ""]);
  merges.push({ s: { r, c: 1 }, e: { r, c: 7 } }); r++;
  data.push([sc("ADDRESS:", labelStyle), sc("", inputStyle), "", "", "", "", "", ""]);
  merges.push({ s: { r, c: 1 }, e: { r, c: 7 } }); r++;
  data.push([sc("KIND ATTENTION:", labelStyle), sc("", inputStyle), "", "", "", "", "", ""]);
  merges.push({ s: { r, c: 1 }, e: { r, c: 7 } }); r++;
  data.push([sc("SUBJECT:", labelStyle), sc("", inputStyle), "", "", "", "", "", ""]);
  merges.push({ s: { r, c: 1 }, e: { r, c: 7 } }); r++;
  data.push([]); r++;

  // Table header
  const th = { font: { bold: true, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "1F4E79" } }, alignment: { horizontal: "center", wrapText: true }, border: { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } } };
  data.push(TEMPLATE_HEADERS.map((h) => sc(h, th))); r++;

  // Example sections with blank rows
  const secStyle = { font: { bold: true, sz: 10 }, fill: { fgColor: { rgb: "C6EFCE" } }, alignment: { horizontal: "center" }, border: { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } } };
  const blankBorder = { border: { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } } };

  for (let sec = 1; sec <= 2; sec++) {
    data.push([sc(`SECTION ${sec} (RENAME THIS)`, secStyle), sc("", secStyle), sc("", secStyle), sc("", secStyle), sc("", secStyle), sc("", secStyle), sc("", secStyle), sc("", secStyle)]);
    merges.push({ s: { r, c: 0 }, e: { r, c: 7 } }); r++;
    for (let i = 0; i < 10; i++) {
      data.push(["", sc("", blankBorder), sc("", blankBorder), sc("", blankBorder), sc("", blankBorder), sc("", blankBorder), sc("", blankBorder), sc("", blankBorder)]);
      r++;
    }
  }

  // Totals section
  data.push([]); r++;
  const totLabel = { font: { bold: true, sz: 10 }, fill: { fgColor: { rgb: "FFFFCC" } }, alignment: { horizontal: "center" }, border: { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } } };
  const totAuto = { font: { bold: true, sz: 10, color: { rgb: "666666" } }, fill: { fgColor: { rgb: "F0F0F0" } }, alignment: { horizontal: "center" }, border: { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } } };
  const totInput = { font: { bold: true, sz: 10 }, fill: { fgColor: { rgb: "FFF3CD" } }, alignment: { horizontal: "center" }, border: { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } } };

  // Auto-calculated
  data.push(["", "", "", "", "", sc("TOTAL AMOUNT", totLabel), sc("", totLabel), sc("(auto)", totAuto)]);
  merges.push({ s: { r, c: 5 }, e: { r, c: 6 } }); r++;
  // User-defined inputs (yellow)
  data.push(["", "", "", "", "", sc("SEASONAL DISCOUNT", totInput), sc("", totInput), sc("", totInput)]);
  merges.push({ s: { r, c: 5 }, e: { r, c: 6 } }); r++;
  data.push(["", "", "", "", "", sc("SPECIAL DISCOUNT", totInput), sc("", totInput), sc("", totInput)]);
  merges.push({ s: { r, c: 5 }, e: { r, c: 6 } }); r++;
  data.push(["", "", "", "", "", sc("TRANSPORTATION CHARGES", totInput), sc("", totInput), sc("", totInput)]);
  merges.push({ s: { r, c: 5 }, e: { r, c: 6 } }); r++;
  data.push(["", "", "", "", "", sc("PACKING CHARGES", totInput), sc("", totInput), sc("", totInput)]);
  merges.push({ s: { r, c: 5 }, e: { r, c: 6 } }); r++;
  // Auto-calculated
  data.push(["", "", "", "", "", sc("TOTAL AFTER DISCOUNT", totLabel), sc("", totLabel), sc("(auto)", totAuto)]);
  merges.push({ s: { r, c: 5 }, e: { r, c: 6 } }); r++;
  data.push(["", "", "", "", "", sc("TAXABLE VALUE", totLabel), sc("", totLabel), sc("(auto)", totAuto)]);
  merges.push({ s: { r, c: 5 }, e: { r, c: 6 } }); r++;
  data.push(["", "", "", "", "", sc("GST 18%", totLabel), sc("", totLabel), sc("(auto)", totAuto)]);
  merges.push({ s: { r, c: 5 }, e: { r, c: 6 } }); r++;
  data.push(["", "", "", "", "", sc("GRAND TOTAL", { font: { bold: true, sz: 11 }, fill: { fgColor: { rgb: "FFD700" } }, alignment: { horizontal: "center" }, border: { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } } }), sc("", { fill: { fgColor: { rgb: "FFD700" } }, border: { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } } }), sc("(auto)", totAuto)]);
  merges.push({ s: { r, c: 5 }, e: { r, c: 6 } }); r++;

  const ws = XLSX.utils.aoa_to_sheet(data);
  ws["!merges"] = merges;
  ws["!cols"] = [
    { wch: 18 },  // Labels / SL NO
    { wch: 12 },  // ITEM CODE
    { wch: 28 },  // ITEM NAME
    { wch: 50 },  // ADDITIONAL DESCRIPTION
    { wch: 14 },  // SIZE
    { wch: 22 },  // HSN CODE / Totals label
    { wch: 6 },   // QTY
    { wch: 14 },  // RATE / Amount
  ];

  XLSX.utils.book_append_sheet(wb, ws, "Template");
  XLSX.writeFile(wb, "Prestair_Quotation_Template.xlsx");
}

// ── Import filled template ────────────────────────────────────────────────────
export type ImportResult = {
  rows: SavedRowState[];
  gross: number;
  discounts: QuotationDiscounts;
  afterDiscount: number;
  gst: number;
  grandTotal: number;
  // Parsed metadata from template
  userName: string;
  partyName: string;
  partyAddress: string;
  attention: string;
  subject: string;
};

export async function importTemplate(file: File): Promise<ImportResult> {
  const XLSX = await import("xlsx");
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  if (!ws) throw new Error("No worksheet found in file");

  const rawData: (string | number | undefined)[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });

  // ── Parse metadata from top rows ───────────────────────────────────────────
  let userName = "", partyName = "", partyAddress = "", attention = "", subject = "";
  for (let i = 0; i < Math.min(15, rawData.length); i++) {
    const row = rawData[i];
    if (!row) continue;
    const first = String(row[0] || "").toUpperCase().trim();
    const value = String(row[1] || "").trim();
    if (first.includes("USER NAME")) userName = value;
    else if (first.includes("CLIENT NAME") || first.includes("M/S")) partyName = value;
    else if (first.includes("ADDRESS")) partyAddress = value;
    else if (first.includes("KIND ATTENTION") || first.includes("ATTENTION")) attention = value;
    else if (first.includes("SUBJECT")) subject = value;
  }

  // ── Parse discount values from totals section ──────────────────────────────
  let seasonalDiscount = 0, specialDiscount = 0, transportationAmt = 0, packingAmt = 0;
  for (let i = 0; i < rawData.length; i++) {
    const row = rawData[i];
    if (!row) continue;
    // Look in columns 5-7 for total labels
    const label = String(row[5] || row[0] || "").toUpperCase().trim();
    const val = Number(row[7] || row[6] || 0) || 0;
    if (label.includes("SEASONAL DISCOUNT") && val > 0) seasonalDiscount = val;
    else if (label.includes("SPECIAL DISCOUNT") && val > 0) specialDiscount = val;
    else if (label.includes("TRANSPORTATION") && val > 0) transportationAmt = val;
    else if (label.includes("PACKING") && val > 0) packingAmt = val;
  }

  // ── Find header row ────────────────────────────────────────────────────────
  const rows: SavedRowState[] = [];
  let currentSection = "";
  let slNo = 0;

  let headerRowIdx = -1;
  for (let i = 0; i < Math.min(20, rawData.length); i++) {
    const row = rawData[i];
    if (row && row.some((cell) => {
      const s = String(cell || "").toUpperCase();
      return s === "ITEM CODE" || s === "ITEM NAME";
    })) {
      headerRowIdx = i;
      break;
    }
  }
  if (headerRowIdx === -1) throw new Error("Could not find header row (ITEM CODE / ITEM NAME)");

  // ── Parse item rows ────────────────────────────────────────────────────────
  // Find where totals section starts (stop parsing items there)
  let totalsStartIdx = rawData.length;
  for (let i = headerRowIdx + 1; i < rawData.length; i++) {
    const row = rawData[i];
    if (!row) continue;
    const cell5 = String(row[5] || "").toUpperCase().trim();
    if (cell5.includes("TOTAL AMOUNT") || cell5.includes("GRAND TOTAL")) {
      totalsStartIdx = i;
      break;
    }
  }

  for (let i = headerRowIdx + 1; i < totalsStartIdx; i++) {
    const row = rawData[i];
    if (!row || row.every((cell) => !cell && cell !== 0)) continue;

    const cellValues = row.map((c) => (c !== undefined && c !== null) ? String(c).trim() : "");

    // Detect section header: first cell has text, all other cells are empty or same value
    const firstCell = cellValues[0] || "";
    const restCells = cellValues.slice(1);
    const hasOnlyFirst = restCells.every((c) => !c || c === firstCell);

    // Section: first cell is non-numeric, rest are empty/same, and looks like a header not data
    const col1 = cellValues[1] || "";
    const col2 = cellValues[2] || "";
    const col1Empty = !col1 || col1 === firstCell;
    const col2Empty = !col2 || col2 === firstCell;
    const isSection = hasOnlyFirst && firstCell.length > 2 && !firstCell.match(/^\d+$/) && col1Empty && col2Empty;

    if (isSection) {
      // Skip if this section was already added (anywhere, not just consecutive)
      if (rows.some((rr) => rr.rowType === "section" && rr.desc.toUpperCase() === firstCell.toUpperCase())) continue;
      currentSection = firstCell;
      rows.push({
        id: `section-import-${Date.now()}-${i}`,
        rowType: "section",
        desc: firstCell,
        size: "", hsn: "", section: firstCell,
        qty: 0, additionalColumn: "",
        discount: 0, discountIsPerUnit: true,
        rate: null, amt: null, checked: true,
      });
      continue;
    }

    // Item row: [SL NO, ITEM CODE, ITEM NAME, ADDITIONAL DESC, SIZE, HSN, QTY, RATE]
    const itemCode = cellValues[1] || "";
    const itemName = cellValues[2] || "";
    const additionalDesc = cellValues[3] || "";
    const size = cellValues[4] || "";
    const hsn = cellValues[5] || "";
    const qty = Number(cellValues[6]) || 1;
    const rate = cellValues[7] ? Number(cellValues[7]) : null;

    if (!itemCode && !itemName && !additionalDesc && !size) continue;

    slNo++;
    const amt = rate !== null ? qty * rate : null;

    rows.push({
      id: itemCode || `item-${slNo}`,
      rowType: "item",
      desc: itemName, size, hsn,
      section: currentSection || "Custom",
      qty, additionalColumn: additionalDesc,
      discount: 0, discountIsPerUnit: false,
      rate, amt, checked: true,
    });
  }

  // Remove sections that have no items after them
  const filteredRows: SavedRowState[] = [];
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].rowType === "section") {
      // Check if there's at least one item before the next section or end
      const hasItems = rows.slice(i + 1).findIndex((r) => r.rowType === "section") === -1
        ? rows.slice(i + 1).some((r) => r.rowType === "item")
        : rows.slice(i + 1, i + 1 + rows.slice(i + 1).findIndex((r) => r.rowType === "section")).some((r) => r.rowType === "item");
      if (hasItems) filteredRows.push(rows[i]);
    } else {
      filteredRows.push(rows[i]);
    }
  }

  if (filteredRows.filter((r) => r.rowType === "item").length === 0) {
    throw new Error("No items found in the template. Make sure data is filled under section headers.");
  }

  // ── Calculate totals ───────────────────────────────────────────────────────
  const gross = filteredRows.reduce((sum, r) => sum + (r.amt ?? 0), 0);
  const totalDiscount = seasonalDiscount + specialDiscount;
  const afterDiscount = Math.max(0, gross - totalDiscount);
  const taxable = afterDiscount + transportationAmt + packingAmt;
  const gst = Math.round(taxable * 0.18);
  const grandTotal = taxable + gst;

  const discounts: QuotationDiscounts = {
    seasonal: { enabled: seasonalDiscount > 0, amount: seasonalDiscount },
    special: { enabled: specialDiscount > 0, amount: specialDiscount },
    legacyAmount: 0,
    transportationAmount: transportationAmt,
    packingAmount: packingAmt,
  };

  return { rows: filteredRows, gross, discounts, afterDiscount, gst, grandTotal, userName, partyName, partyAddress, attention, subject };
}
