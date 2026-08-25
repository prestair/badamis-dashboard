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
  const labelStyle  = { font: { bold: true, sz: 9, color: { rgb: "1F4E79" } } };
  const inputStyle  = { font: { sz: 10 }, fill: { fgColor: { rgb: "FFFDE7" } }, border: { bottom: { style: "thin", color: { rgb: "AAAAAA" } } } };
  const noteStyle   = { font: { sz: 8, italic: true, color: { rgb: "999999" } } };

  // ── Title ──
  data.push([sc("PRESTAIR QUOTATION IMPORT TEMPLATE", { font: { bold: true, sz: 14, color: { rgb: "1F4E79" } } }), "", "", "", "", "", "", ""]);
  merges.push({ s: { r, c: 0 }, e: { r, c: 7 } }); r++;
  data.push([sc("Fill yellow cells. Do NOT change row order or column structure. SL NO is auto-generated on import — leave it blank.", noteStyle), "", "", "", "", "", "", ""]);
  merges.push({ s: { r, c: 0 }, e: { r, c: 7 } }); r++;
  data.push([]); r++;

  // ── PARTY DETAILS (left) + QUOTATION DETAILS (right) ──
  // Row: USER NAME | value | | | DATE | (auto on import)
  data.push([
    sc("USER NAME:", labelStyle), sc("", inputStyle), sc("", inputStyle), sc("", inputStyle),
    sc("DATE:", labelStyle), sc("(auto: today on import)", noteStyle), "", "",
  ]);
  merges.push({ s: { r, c: 1 }, e: { r, c: 3 } });
  merges.push({ s: { r, c: 5 }, e: { r, c: 7 } }); r++;

  // Row: CLIENT NAME | value | | | REQUESTER | value
  data.push([
    sc("CLIENT NAME (M/S):", labelStyle), sc("", inputStyle), sc("", inputStyle), sc("", inputStyle),
    sc("REQUESTER:", labelStyle), sc("", inputStyle), sc("", inputStyle), sc("", inputStyle),
  ]);
  merges.push({ s: { r, c: 1 }, e: { r, c: 3 } });
  merges.push({ s: { r, c: 5 }, e: { r, c: 7 } }); r++;

  // Row: ADDRESS | value | | | GST NO | value
  data.push([
    sc("ADDRESS:", labelStyle), sc("", inputStyle), sc("", inputStyle), sc("", inputStyle),
    sc("GST NO.:", labelStyle), sc("", inputStyle), sc("", inputStyle), sc("", inputStyle),
  ]);
  merges.push({ s: { r, c: 1 }, e: { r, c: 3 } });
  merges.push({ s: { r, c: 5 }, e: { r, c: 7 } }); r++;

  // Row: KIND ATTENTION | value | | | (empty right side)
  data.push([
    sc("KIND ATTENTION:", labelStyle), sc("", inputStyle), sc("", inputStyle), sc("", inputStyle),
    "", "", "", "",
  ]);
  merges.push({ s: { r, c: 1 }, e: { r, c: 3 } }); r++;

  // Row: SUBJECT | value (full width)
  data.push([sc("SUBJECT:", labelStyle), sc("", inputStyle), sc("", inputStyle), sc("", inputStyle), sc("", inputStyle), sc("", inputStyle), sc("", inputStyle), sc("", inputStyle)]);
  merges.push({ s: { r, c: 1 }, e: { r, c: 7 } }); r++;

  data.push([]); r++;

  // ── Items table header ──
  const th = {
    font: { bold: true, color: { rgb: "FFFFFF" } },
    fill: { fgColor: { rgb: "1F4E79" } },
    alignment: { horizontal: "center", wrapText: true },
    border: { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } },
  };
  const thNote = {
    font: { bold: true, color: { rgb: "FFFFFF" }, italic: true },
    fill: { fgColor: { rgb: "888888" } },
    alignment: { horizontal: "center", wrapText: true },
    border: { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } },
  };
  data.push([
    sc("SL NO\n(auto — leave blank)", thNote),
    ...TEMPLATE_HEADERS.slice(1).map((h) => sc(h, th)),
  ]); r++;

  // ── Example sections ──
  const secStyle = {
    font: { bold: true, sz: 10 },
    fill: { fgColor: { rgb: "DDEEFF" } },
    alignment: { horizontal: "center" },
    border: { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } },
  };
  const blankBorder = {
    fill: { fgColor: { rgb: "FFFDE7" } },
    border: { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } },
  };

  for (let sec = 1; sec <= 2; sec++) {
    data.push([
      sc(`SECTION ${sec} (RENAME OR DELETE)`, secStyle), sc("", secStyle), sc("", secStyle), sc("", secStyle),
      sc("", secStyle), sc("", secStyle), sc("", secStyle), sc("", secStyle),
    ]);
    merges.push({ s: { r, c: 0 }, e: { r, c: 7 } }); r++;
    for (let i = 0; i < 8; i++) {
      data.push([
        sc("", blankBorder), sc("", blankBorder), sc("", blankBorder), sc("", blankBorder),
        sc("", blankBorder), sc("", blankBorder), sc("", blankBorder), sc("", blankBorder),
      ]);
      r++;
    }
  }

  data.push([]); r++;

  // ── Totals section ──
  const totLabel = {
    font: { bold: true, sz: 10 },
    fill: { fgColor: { rgb: "FFFFCC" } },
    alignment: { horizontal: "center" },
    border: { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } },
  };
  const totInput = {
    font: { bold: true, sz: 10 },
    fill: { fgColor: { rgb: "FFF3CD" } },
    alignment: { horizontal: "center" },
    border: { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } },
  };
  const totAuto = {
    font: { bold: true, sz: 10, color: { rgb: "888888" } },
    fill: { fgColor: { rgb: "F0F0F0" } },
    alignment: { horizontal: "center" },
    border: { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } },
  };
  const totGold = {
    font: { bold: true, sz: 11 },
    fill: { fgColor: { rgb: "FFD700" } },
    alignment: { horizontal: "center" },
    border: { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } },
  };

  const pushTot = (label: string, style: object, isAuto = false) => {
    data.push(["", "", "", "", "",
      sc(label, style), sc("", style),
      isAuto ? sc("(auto)", totAuto) : sc("", totInput),
    ]);
    merges.push({ s: { r, c: 5 }, e: { r, c: 6 } }); r++;
  };

  pushTot("TOTAL AMOUNT (A)", totLabel, true);
  pushTot("DISCOUNT % (Part A) — enter % value", totInput);        // e.g. 10 means 10%
  pushTot("SPECIAL DISCOUNT (Part A)", totInput);
  pushTot("SEASONAL DISCOUNT (Part A)", totInput);
  pushTot("TOTAL AFTER DISCOUNT (A)", totLabel, true);
  data.push([]); r++;
  pushTot("TOTAL AMOUNT (B) — fill only if Part B used", totInput);
  pushTot("DISCOUNT % (Part B) — enter % value", totInput);
  pushTot("TOTAL AFTER DISCOUNT (B)", totLabel, true);
  data.push([]); r++;
  pushTot("TRANSPORTATION CHARGES", totInput);
  pushTot("PACKING CHARGES", totInput);
  pushTot("TAXABLE VALUE", totLabel, true);
  pushTot("GST 18%", totLabel, true);

  // Grand Total
  data.push(["", "", "", "", "",
    sc("GRAND TOTAL", totGold), sc("", totGold), sc("(auto)", totAuto),
  ]);
  merges.push({ s: { r, c: 5 }, e: { r, c: 6 } }); r++;

  data.push([]); r++;
  data.push([sc("NOTE: Yellow cells = fill in. (auto) cells = calculated on import. SL NO column chhod do — import par automatically fill hoga. Do NOT add extra rows above the item table.", noteStyle), "", "", "", "", "", "", ""]);
  merges.push({ s: { r, c: 0 }, e: { r, c: 7 } }); r++;

  const ws = XLSX.utils.aoa_to_sheet(data);
  ws["!merges"] = merges;
  ws["!cols"] = [
    { wch: 20 },  // Labels / SL NO
    { wch: 12 },  // ITEM CODE
    { wch: 28 },  // ITEM NAME
    { wch: 50 },  // ADDITIONAL DESCRIPTION
    { wch: 14 },  // SIZE
    { wch: 28 },  // HSN CODE / Totals label
    { wch: 8 },   // QTY
    { wch: 16 },  // RATE / Amount
  ];

  XLSX.utils.book_append_sheet(wb, ws, "Quotation Template");
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

  // ── Parse metadata from top rows (scan first 20 rows) ─────────────────────
  let userName = "", partyName = "", partyAddress = "", partyGST = "", attention = "", subject = "", requester = "";

  for (let i = 0; i < Math.min(20, rawData.length); i++) {
    const row = rawData[i];
    if (!row) continue;

    // Check col 0 (left side labels)
    const left  = String(row[0] || "").toUpperCase().trim();
    const leftVal = String(row[1] || "").trim();

    // Check col 4 (right side labels)
    const right   = String(row[4] || "").toUpperCase().trim();
    const rightVal = String(row[5] || "").trim();

    if (left.includes("USER NAME"))                           userName    = leftVal;
    if (left.includes("CLIENT NAME") || left.includes("M/S")) partyName  = leftVal;
    if (left.includes("ADDRESS"))                             partyAddress = leftVal;
    if (left.includes("KIND ATTENTION") || (left.includes("ATTENTION") && !left.includes("KIND") === false)) attention = leftVal;
    if (left.includes("SUBJECT"))                             subject     = leftVal;

    if (right.includes("REQUESTER"))                          requester   = rightVal;
    if (right.includes("GST NO") || right.includes("GST:"))  partyGST    = rightVal;
    if (right.includes("DATE") && !right.includes("UPDAT"))  { /* date auto */ }
  }

  // ── Parse discount/totals from totals section ──────────────────────────────
  let seasonalDiscount = 0, specialDiscount = 0, transportationAmt = 0, packingAmt = 0;
  let discountPercentA = 0, discountPercentB = 0;

  for (let i = 0; i < rawData.length; i++) {
    const row = rawData[i];
    if (!row) continue;
    const label = String(row[5] || row[0] || "").toUpperCase().trim();
    const val   = Number(row[7] ?? row[6] ?? 0) || 0;

    if (label.includes("DISCOUNT % (PART A)") || label.includes("DISCOUNT % PART A"))  discountPercentA  = val;
    else if (label.includes("DISCOUNT % (PART B)") || label.includes("DISCOUNT % PART B")) discountPercentB = val;
    else if (label.includes("SEASONAL DISCOUNT"))    seasonalDiscount  = val;
    else if (label.includes("SPECIAL DISCOUNT"))     specialDiscount   = val;
    else if (label.includes("TRANSPORTATION"))        transportationAmt = val;
    else if (label.includes("PACKING"))               packingAmt        = val;
  }

  // ── Find header row (ITEM CODE / ITEM NAME) ────────────────────────────────
  let headerRowIdx = -1;
  for (let i = 0; i < Math.min(25, rawData.length); i++) {
    const row = rawData[i];
    if (row && row.some((cell) => {
      const s = String(cell || "").toUpperCase().trim();
      return s === "ITEM CODE" || s === "ITEM NAME";
    })) {
      headerRowIdx = i;
      break;
    }
  }
  if (headerRowIdx === -1) throw new Error("Could not find header row (ITEM CODE / ITEM NAME). Check template structure.");

  // ── Find totals section start ──────────────────────────────────────────────
  let totalsStartIdx = rawData.length;
  for (let i = headerRowIdx + 1; i < rawData.length; i++) {
    const row = rawData[i];
    if (!row) continue;
    const c5 = String(row[5] || "").toUpperCase().trim();
    const c0 = String(row[0] || "").toUpperCase().trim();
    if (c5.includes("TOTAL AMOUNT") || c5.includes("GRAND TOTAL") || c0.includes("NOTE:")) {
      totalsStartIdx = i;
      break;
    }
  }

  // ── Parse item rows ────────────────────────────────────────────────────────
  const rows: SavedRowState[] = [];
  let currentSection = "";
  let slNo = 0;

  for (let i = headerRowIdx + 1; i < totalsStartIdx; i++) {
    const row = rawData[i];
    if (!row || row.every((cell) => !cell && cell !== 0)) continue;

    const cv = row.map((c) => (c !== undefined && c !== null) ? String(c).trim() : "");
    const firstCell  = cv[0] || "";
    const isSection  = firstCell.length > 1
      && !firstCell.match(/^\d+$/)
      && (cv.slice(1).every((c) => !c || c === firstCell));

    if (isSection) {
      if (rows.some((rr) => rr.rowType === "section" && rr.desc.toUpperCase() === firstCell.toUpperCase())) continue;
      currentSection = firstCell;
      rows.push({
        id: `section-import-${Date.now()}-${i}`,
        rowType: "section",
        desc: firstCell, size: "", hsn: "",
        section: firstCell, qty: 0,
        additionalColumn: "", discount: 0,
        discountIsPerUnit: true, rate: null, amt: null, checked: true,
      });
      continue;
    }

    // Item: [SL NO, ITEM CODE, ITEM NAME, ADDITIONAL DESC, SIZE, HSN, QTY, RATE]
    const itemCode      = cv[1] || "";
    const itemName      = cv[2] || "";
    const additionalDesc = cv[3] || "";
    const size          = cv[4] || "";
    const hsn           = cv[5] || "";
    const qty           = Number(cv[6]) || 1;
    const rate          = cv[7] ? Number(cv[7]) : null;

    if (!itemCode && !itemName && !additionalDesc) continue;

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

  // Remove empty sections
  const filteredRows: SavedRowState[] = [];
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].rowType === "section") {
      const nextSecIdx = rows.slice(i + 1).findIndex((r) => r.rowType === "section");
      const slice = nextSecIdx === -1 ? rows.slice(i + 1) : rows.slice(i + 1, i + 1 + nextSecIdx);
      if (slice.some((r) => r.rowType === "item")) filteredRows.push(rows[i]);
    } else {
      filteredRows.push(rows[i]);
    }
  }

  if (filteredRows.filter((r) => r.rowType === "item").length === 0) {
    throw new Error("No items found in template. Fill item rows under section headers.");
  }

  // ── Calculate totals ───────────────────────────────────────────────────────
  const gross          = filteredRows.reduce((sum, r) => sum + (r.amt ?? 0), 0);
  const discountAmtA   = Math.round(gross * discountPercentA / 100);
  const totalDiscountA = discountAmtA + seasonalDiscount + specialDiscount;
  const afterDiscountA = Math.max(0, gross - totalDiscountA);
  const taxable        = afterDiscountA + transportationAmt + packingAmt;
  const gst            = Math.round(taxable * 0.18);
  const grandTotal     = taxable + gst;

  const discounts: QuotationDiscounts = {
    seasonal:             { enabled: seasonalDiscount > 0,  amount: seasonalDiscount },
    special:              { enabled: specialDiscount > 0,   amount: specialDiscount },
    legacyAmount:         0,
    transportationAmount: transportationAmt,
    packingAmount:        packingAmt,
    discountPercentA:     discountPercentA,
    discountPercentB:     discountPercentB,
    partBEnabled:         false,   // Part B via import not supported yet
    gstEnabled:           true,
  };

  return {
    rows: filteredRows, gross, discounts,
    afterDiscount: afterDiscountA, gst, grandTotal,
    userName, partyName, partyAddress, partyGST, attention, subject, requester,
  };
}
