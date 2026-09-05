"use client";

import { useState } from "react";
import { SavedQuotation } from "@/context/QuotationContext";
import { QuotationDiscounts } from "@/lib/quotationAudit";

type Props = {
  quotation?:    SavedQuotation;
  partyName:     string;
  partyAddress:  string;
  partyGST:      string;
  attention:     string;
  quotationNo:   string;
  date:          string;
  subject:       string;
  rows:          RowData[];
  gross:         number;
  discounts:     QuotationDiscounts;
  afterDiscount: number;
  gst:           number;
  grandTotal:    number;
  // Part B support
  partBRows?:    RowData[];
  grossB?:       number;
  afterDiscountB?: number;
};

type RowData = {
  rowType?: "item" | "section";
  slNo: string; itemCode: string; desc: string; size: string;
  hsn: string; qty: string; additionalColumn: string; rate: string; amt: number | null;
  section?: string;
};

// Filter out sections that have no items after them (before next section or end)
function filterEmptySections(rows: RowData[]): RowData[] {
  const result: RowData[] = [];
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].rowType === "section") {
      let hasItems = false;
      for (let j = i + 1; j < rows.length; j++) {
        if (rows[j].rowType === "section") break;
        hasItems = true; break;
      }
      if (hasItems) result.push(rows[i]);
    } else {
      result.push(rows[i]);
    }
  }
  return result;
}

// Format stored YYYY-MM-DD to DD/MM/YYYY for display
function fmtDateDisplay(dateStr: string): string {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-");
  if (!y || !m || !d) return dateStr;
  return `${d}/${m}/${y}`;
}

const fmtNum = (n: number) => n.toLocaleString("en-IN");

// Detect section from item code prefix
function detectSection(itemCode: string): string {
  const code = (itemCode || "").toUpperCase();
  if (code.startsWith("DC")) return "DISPLAY COUNTER";
  if (code.startsWith("BC")) return "BACK COUNTER (DISPLAY SECTION)";
  if (code.startsWith("MI")) return "MITHAI COORDINATION - ROOM";
  if (code.startsWith("SC")) return "SERVICE COUNTER";
  if (code.startsWith("MK")) return "MAIN KITCHEN";
  if (code.startsWith("CR")) return "COLD ROOM";
  if (code.startsWith("DW")) return "DISH WASH SECTION";
  if (code.startsWith("EX")) return "EXHAUST HOOD";
  return "";
}

const TERMS = [
  "1. Rates: - valid for 10 days from the date of offer.",
  "2. Delivery Period: - 8 WEEKS from the date of advance. (However, under unavoidable circumstances like natural calamities, war strikes etc., we shall not be liable for any cancellation or delay in meeting delivery date.)",
  "3. Taxes: - G.S.T & Other taxes will be charged extra as applicable by Central Govt./State Govt. time to time.",
  "4. Transportation/Forwarding/Loading/Unloading: - Extra on actual paid by client. Client may also arrange their own vehicle for pickup.",
  "5. Way bill/Road Permit if required, to be arranged by the Client.",
  "6. Packing: (a) Shrink roll/thermocol packing FOC. (b) Wooden crate/cargo box packing charge extra on actual if required.",
  "7. Site work: - All civil/masonry/wooden/electrical work done by client at his own cost. Rates: ex-works, Delhi.",
  "8. Payment Terms: (a) 60% advance along with confirm purchase order and balance 40% payment before delivery from our warehouse. (b) 100% advance along with confirm purchase order for Imported Equipment.",
  "9. Jurisdiction Noida (U.P)",
  "10. The order is/are accepted, subject to strikes, lockout, accidents, fire, riots, civil commotion & other causes beyond our control.",
  "11. The lodging and boarding of the mechanic team will be arranged by the client at their own cost outside Delhi.",
  "12. Once the order is placed cannot be cancelled.",
  "13. Installation- Installation Requirement: Exact utility requirements (eg. Electrical, gas, steam connections & load at site) shall be advised after receipt of confirmed purchase order. Customer must ensure the provisions of all utilities exactly as per the information provided before the visit of technician at site. If the installation could not be completed in case of any lack in site requirement, the visit shall be considered as valid & any additional charges will be done on chargeable basis.",
  "14. Warranty Period: (a) 12 months by the manufacture for defective parts from the date of invoicing. (b) Exclude consumables and wear & tear parts/components like seals, digital controllers, gaskets etc. (c) The warranty will not be applicable if any component gets damaged due to voltage fluctuation, mishandling by operator. (d) Warranty will be null and void if equipment is either installed or repaired by person/s not authorized by PRESTAIR.",
  "15. Inspections: All equipment/material shall be dispatched only after inspection by your representative at our works. Inspection waiver: In case the client wants us to dispatch the equipment/material without inspection, then the client shall issue an inspection waiver certificate. Insurance: 2% on customer request.",
  "16. General Specifications:",
  "  .All Frame Work -32x32x3 Stainless Steel Angle.",
  "  .Tops Of All Tables, Sinks, Burner Ranges- 16 Swg (1.5mm) Plastic Coated Prime finish Stainless Steel Sheet 304 Grade.",
  "  .Tops Of All UC ref- 18 Swg (1.2mm) Plastic Coated Prime finish Stainless Steel Sheet 304 Grades with Puff insulation.",
  "  .Sink Are Made Of 14 Swg 304 2B Polished.",
  "  .All dish wash areas/Sink Tables Are complete 304 S.S Plastic Coated Prime finish With Waste Fitted.",
  "  .All cold tanks area 0.8mm Plastic Coated Prime finish 304 Ss Grade.",
  "  .All hot tanks area 1.2mm 304 Ss Grade.",
  "  .All Under Shelves 18 Swg (1.2mm) Plastic Coated Prime finish Stainless Steel Sheet, Grade- J4.",
  "  .Drawers -20 Swg (1mm) Plastic Coated Prime finish Stainless Steel Sheet, Grade J4.",
  "  .Covering Of 20 Swg (1mm) Stainless Steel Sheet Plastic Coated Prime finish Grade J4.",
  "  .Legs 40x40mm Ss Pipe 1.2mm, Polished J4 grades With Adjustable Bullet Feet PVC.",
  "  .Ex Hoods- 20 swg (1mm), Plastic Coated Prime finish Stainless Steel J4 grade with baffle filters, LED Lights.",
  "  .Cold Unit -Compressor Emerson/Tecumseh.",
  "  .All Burners Are Available In LPG/PNG.",
  "  .All Burner Ranges Are With Pilots And Burners Pan Supports Heavy Duty as per drawings.",
  "  .For Display counters-Front & Top Glass 8mm, Side Glass 10mm and Shelves 10mm.",
];

// ── EXCEL ─────────────────────────────────────────────────────────────────────
async function downloadExcel(props: Props) {
  const XLSX = await import("xlsx-js-style");
  const wb = XLSX.utils.book_new();

  const safeNum = (n: number) => (isNaN(n) || n === null || n === undefined) ? 0 : n;

  // Style definitions
  const boldWrap = { font: { bold: true }, alignment: { wrapText: true } };
  const cBorder = { alignment: { wrapText: true, vertical: "top", horizontal: "center" }, border: { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } } };
  const lBorder = { alignment: { wrapText: true, vertical: "top" }, border: { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } } };

  type CellVal = string | number | { v: string | number; s: object };
  const data: CellVal[][] = [];
  const merges: { s: { r: number; c: number }; e: { r: number; c: number } }[] = [];
  let r = 0;
  const sc = (v: string | number, s: object): { v: string | number; s: object } => ({ v, s });

  // Rows 0-1: reserved for logo image
  data.push(["", "", "", "", "", "", "", "", ""]); r++;
  data.push(["", "", "", "", "", "", "", "", ""]); r++;
  // Row 2 (index 2): Commercial Food Service Equipments
  data.push([sc("Commercial Food Service Equipments", { font: { bold: true, sz: 8, color: { rgb: "1A3A6B" } } }), "", "", "", "", "", "", "", ""]);
  merges.push({ s: { r, c: 0 }, e: { r, c: 8 } }); r++;
  // Row 3 (index 3): Address
  data.push([sc("B-127 Phase-2, Noida, Uttar Pradesh 201305 | GST: 09AATFP8342B1ZX", { font: { sz: 8 } }), "", "", "", "", "", "", "", ""]);
  merges.push({ s: { r, c: 0 }, e: { r, c: 8 } }); r++;
  data.push([]); r++;

  // Date & Quotation No — merged cells so full text shows
  data.push([sc(`Date: ${fmtDateDisplay(props.date)}`, { font: { bold: true, sz: 10 } }), "", "", "", "", sc(`Quotation No: ${props.quotationNo}`, { font: { bold: true, sz: 10 }, alignment: { horizontal: "right" } }), "", "", ""]);
  merges.push({ s: { r, c: 0 }, e: { r, c: 2 } }); merges.push({ s: { r, c: 5 }, e: { r, c: 8 } }); r++;
  data.push([]); r++;

  // Party details
  data.push([sc(`M/S: ${props.partyName}`, { font: { bold: true, sz: 11 } }), "", "", "", "", "", "", "", ""]);
  merges.push({ s: { r, c: 0 }, e: { r, c: 8 } }); r++;
  if (props.partyAddress) { data.push([sc(props.partyAddress, boldWrap), "", "", "", "", "", "", "", ""]); merges.push({ s: { r, c: 0 }, e: { r, c: 8 } }); r++; }
  if (props.partyGST) { data.push([sc(`GST: ${props.partyGST}`, boldWrap), "", "", "", "", "", "", "", ""]); merges.push({ s: { r, c: 0 }, e: { r, c: 8 } }); r++; }
  data.push([]); r++;
  if (props.attention) { data.push([sc(`Kind Attention: ${props.attention}`, boldWrap), "", "", "", "", "", "", "", ""]); merges.push({ s: { r, c: 0 }, e: { r, c: 8 } }); r++; }
  data.push([sc(`SUBJECT: ${props.subject}`, { font: { bold: true, sz: 10 }, alignment: { wrapText: true } }), "", "", "", "", "", "", "", ""]);
  merges.push({ s: { r, c: 0 }, e: { r, c: 8 } }); r++;
  data.push([]); r++;

  // Table header
  // "PART - A" heading in Excel when Part B is enabled
  if (props.discounts.partBEnabled) {
    const partAHeadStyle = { font: { bold: true, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "1E40AF" } }, alignment: { horizontal: "center" }, border: { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } } };
    data.push([sc("PART - A ", partAHeadStyle), sc("", partAHeadStyle), sc("", partAHeadStyle), sc("", partAHeadStyle), sc("", partAHeadStyle), sc("", partAHeadStyle), sc("", partAHeadStyle), sc("", partAHeadStyle), sc("", partAHeadStyle)]);
    merges.push({ s: { r, c: 0 }, e: { r, c: 8 } }); r++;
  }
  const th = { font: { bold: true, sz: 12, color: { rgb: "000000" } }, fill: { fgColor: { rgb: "C8C8C8" } }, alignment: { horizontal: "center", wrapText: true }, border: { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } } };
  data.push([sc("SL NO", th), sc("ITEM CODE", th), sc("ITEM NAME", th), sc("ADDITIONAL DESCRIPTION", th), sc("SIZE", th), sc("HSN CODE", th), sc("QTY", th), sc("RATE", th), sc("AMOUNT", th)]); r++;

  // Item rows
  for (const row of filterEmptySections(props.rows)) {
    if (row.rowType === "section") {
      const ss = { font: { bold: true }, fill: { fgColor: { rgb: "C6EFCE" } }, alignment: { horizontal: "center", wrapText: true }, border: { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } } };
      data.push([sc((row.desc || row.section || "").toUpperCase(), ss), sc("", ss), sc("", ss), sc("", ss), sc("", ss), sc("", ss), sc("", ss), sc("", ss), sc("", ss)]);
      merges.push({ s: { r, c: 0 }, e: { r, c: 8 } }); r++;
    } else {
      data.push([sc(row.slNo || "", cBorder), sc(row.itemCode || "", cBorder), sc(row.desc || "", lBorder), sc(row.additionalColumn || "", lBorder), sc(row.size || "", cBorder), sc(row.hsn || "", cBorder), sc(row.qty || "1", cBorder), sc(row.rate || "NQ", cBorder), sc(row.amt !== null ? row.amt : "NQ", cBorder)]); r++;
    }
  }

  // Totals — label merged from HSN col (5) to RATE col (7), amount in col 8
  const ts = { font: { bold: true }, fill: { fgColor: { rgb: "FFFFCC" } }, alignment: { horizontal: "center" }, border: { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } } };
  const pushT = (label: string, amount: number | string, style: object) => { data.push(["", "", "", "", "", sc(label, style), sc("", style), sc("", style), sc(amount, style)]); merges.push({ s: { r, c: 5 }, e: { r, c: 7 } }); r++; };

  // Part A totals
  const exPctA = safeNum(props.discounts.discountPercentA ?? 0);
  const exDiscountAmountA = Math.round(safeNum(props.gross) * exPctA / 100);
  const exSpecialAmt  = safeNum(props.discounts.special.amount);
  const exSeasonalAmt = safeNum(props.discounts.seasonal.amount);
  const exAfterDiscountA = Math.max(0, safeNum(props.gross) - exDiscountAmountA - exSpecialAmt); // excludes seasonal
  const exFinalTotalA    = Math.max(0, exAfterDiscountA - exSeasonalAmt);                        // after seasonal
  const exEffectiveA     = props.discounts.seasonal.enabled ? exFinalTotalA : exAfterDiscountA;
  const exPartBEnabled = props.discounts.partBEnabled === true;
  const exPctB = safeNum(props.discounts.discountPercentB ?? 0);
  const exGrossB = safeNum(props.grossB ?? 0);
  const exDiscountAmountB = Math.round(exGrossB * exPctB / 100);
  const exAfterDiscountB = Math.max(0, exGrossB - exDiscountAmountB);
  const exCombined = exEffectiveA + (exPartBEnabled ? exAfterDiscountB : 0);

  pushT("TOTAL AMOUNT", safeNum(props.gross), ts);
  if (exPctA > 0) pushT(`DISCOUNT ${exPctA}%`, exDiscountAmountA, ts);
  if (props.discounts.special.enabled) pushT("SPECIAL DISCOUNT", exSpecialAmt, ts);
  if (props.discounts.legacyAmount > 0) pushT("DISCOUNT", safeNum(props.discounts.legacyAmount), ts);
  if (exPctA > 0 || props.discounts.special.enabled || props.discounts.seasonal.enabled || props.discounts.legacyAmount > 0) {
    const afterLabelA = (exPartBEnabled && !props.discounts.seasonal.enabled) ? " (A)" : "";
    pushT("TOTAL AFTER DISCOUNT" + afterLabelA, exAfterDiscountA, ts);
  }
  if (props.discounts.seasonal.enabled) pushT("SEASONAL DISCOUNT", exSeasonalAmt, ts);
  if (props.discounts.seasonal.enabled) pushT("FINAL TOTAL" + (exPartBEnabled ? " (A)" : ""), exFinalTotalA, ts);

  // Part B rows + totals in Excel
  if (exPartBEnabled && props.partBRows && props.partBRows.length > 0) {
    // Part B heading
    const partBHeadStyle = { font: { bold: true, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "3C3C78" } }, alignment: { horizontal: "center" } , border: { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } } };
    data.push([sc("PART - B", partBHeadStyle), sc("", partBHeadStyle), sc("", partBHeadStyle), sc("", partBHeadStyle), sc("", partBHeadStyle), sc("", partBHeadStyle), sc("", partBHeadStyle), sc("", partBHeadStyle), sc("", partBHeadStyle)]);
    merges.push({ s: { r, c: 0 }, e: { r, c: 8 } }); r++;

    // Part B items
    let partBSlNo = 0;
    for (const row of filterEmptySections(props.partBRows)) {
      if (row.rowType === "section") {
        const ss = { font: { bold: true }, fill: { fgColor: { rgb: "C6EFCE" } }, alignment: { horizontal: "center", wrapText: true }, border: { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } } };
        data.push([sc((row.desc || row.section || "").toUpperCase(), ss), sc("", ss), sc("", ss), sc("", ss), sc("", ss), sc("", ss), sc("", ss), sc("", ss), sc("", ss)]);
        merges.push({ s: { r, c: 0 }, e: { r, c: 8 } }); r++;
      } else {
        partBSlNo++;
        data.push([sc(String(partBSlNo), cBorder), sc(row.itemCode || "", cBorder), sc(row.desc || "", lBorder), sc(row.additionalColumn || "", lBorder), sc(row.size || "", cBorder), sc(row.hsn || "", cBorder), sc(row.qty || "1", cBorder), sc(row.rate || "NQ", cBorder), sc(row.amt !== null ? row.amt : "NQ", cBorder)]); r++;
      }
    }

    // Part B totals
    // Part B totals — (B) label us row par jahan se B ka amount A+B mein jaata hai
    pushT("TOTAL AMOUNT" + (exPctB > 0 ? "" : " (B)"), exGrossB, ts);
    if (exPctB > 0) {
      pushT(`DISCOUNT ${exPctB}%`, exDiscountAmountB, ts);
      pushT("TOTAL AFTER DISCOUNT (B)", exAfterDiscountB, ts);
    }
    pushT("TOTAL AMOUNT (A+B)", exCombined, ts);
  }

  // Combined totals
  if (props.discounts.transportationAmount === 0) {
    data.push(["", "", "", "", "", sc("TRANSPORTATION CHARGES", ts), sc("", ts), sc("", ts), sc("As Per Actuals", ts)]);
    merges.push({ s: { r, c: 5 }, e: { r, c: 7 } }); r++;
  } else {
    pushT("TRANSPORTATION CHARGES", safeNum(props.discounts.transportationAmount), ts);
  }
  if (props.discounts.packingAmount === 0) {
    data.push(["", "", "", "", "", sc("PACKING CHARGES", ts), sc("", ts), sc("", ts), sc("As Per Actuals", ts)]);
    merges.push({ s: { r, c: 5 }, e: { r, c: 7 } }); r++;
  } else {
    pushT("PACKING CHARGES", safeNum(props.discounts.packingAmount), ts);
  }
  pushT("TAXABLE VALUE", safeNum(exCombined + props.discounts.transportationAmount + props.discounts.packingAmount), ts);
  if (props.discounts.gstEnabled !== false) {
    pushT("GST 18%", safeNum(props.gst), ts);
    const gs = { font: { bold: true, sz: 11 }, fill: { fgColor: { rgb: "FFD700" } }, alignment: { horizontal: "center" }, border: { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } } };
    pushT("GRAND TOTAL", safeNum(props.grandTotal), gs);
  }
  data.push([]); r++;

  // Terms & Conditions
  data.push(["", sc("Terms & Conditions:", { font: { bold: true, sz: 10, underline: true }, alignment: { wrapText: true } }), "", "", "", "", "", "", ""]); merges.push({ s: { r, c: 1 }, e: { r, c: 8 } }); r++;
  for (const term of TERMS) { data.push(["", sc(term, { font: { sz: 9 }, alignment: { wrapText: true } }), "", "", "", "", "", "", ""]); merges.push({ s: { r, c: 1 }, e: { r, c: 8 } }); r++; }
  data.push([]); r++;

  // Bank Details
  data.push(["", sc("BANK DETAILS", { font: { bold: true, sz: 10, underline: true } }), "", "", "", "", "", "", ""]); merges.push({ s: { r, c: 1 }, e: { r, c: 8 } }); r++;
  for (const line of ["ACCOUNT NAME- PRESTAIR SYSTEMS LLP","ACCOUNT NO - 4513086230","ACCOUNT TYPE- CURRENT ACCOUNT","IFSC CODE-KKBK0000154","BANK - KOTAK MAHINDRA BANK","BRANCH - SECTOR 51 NOIDA","","GST NO-09AATFP8342B1ZX"]) {
    data.push(["", sc(line, boldWrap), "", "", "", "", "", "", ""]); merges.push({ s: { r, c: 1 }, e: { r, c: 8 } }); r++;
  }
  data.push([]); r++; data.push([]); r++;
  data.push(["", sc("For Prestair Systems LLP", { font: { bold: true, sz: 11 } }), "", "", "", "", "", "", ""]); merges.push({ s: { r, c: 1 }, e: { r, c: 8 } }); r++;

  // ── Create worksheet ────────────────────────────────────────────────────────
  const ws = XLSX.utils.aoa_to_sheet(data);
  ws["!merges"] = merges;
  ws["!cols"] = [
    { wch: 5 },   // SL NO
    { wch: 10 },  // ITEM CODE
    { wch: 22 },  // ITEM NAME
    { wch: 46 },  // ADDITIONAL DESCRIPTION (widest)
    { wch: 12 },  // SIZE
    { wch: 14 },  // HSN CODE
    { wch: 5 },   // QTY
    { wch: 10 },  // RATE
    { wch: 12 },  // AMOUNT
  ];
  ws["!rows"] = [{ hpt: 55 }, { hpt: 20 }, { hpt: 20 }]; // row 0 taller for larger logos

  XLSX.utils.book_append_sheet(wb, ws, "Quotation");

  // Save with logo image injected into the xlsx zip
  const fileName = `Quotation_${(props.quotationNo || props.partyName).replace(/[/\\?%*:|"<>]/g, "-")}_${props.date}.xlsx`;
  try {
    const logoRes = await fetch("/logos/prestair-new.png");
    if (!logoRes.ok) throw new Error("no logo");
    const logoBytes = new Uint8Array(await logoRes.arrayBuffer());
    const wbOut: ArrayBuffer = XLSX.write(wb, { type: "array", bookType: "xlsx" });
    const JSZip = (await import("jszip")).default;
    const zip = await JSZip.loadAsync(wbOut);
    zip.file("xl/media/image1.png", logoBytes);

    // Load certification logos
    const certFiles = ["nsf logo.png", "ce.jpg", "uaf.webp", "images.png", "iaf.png"];
    const certImages: { name: string; bytes: Uint8Array }[] = [];
    for (let i = 0; i < certFiles.length; i++) {
      try {
        const res = await fetch(`/logos/${certFiles[i]}`);
        if (res.ok) {
          const ext = certFiles[i].split(".").pop() || "png";
          certImages.push({ name: `image${i + 2}.${ext}`, bytes: new Uint8Array(await res.arrayBuffer()) });
        }
      } catch { /* skip */ }
    }
    // Add cert images to media
    for (const img of certImages) zip.file(`xl/media/${img.name}`, img.bytes);

    const emu = (px: number) => Math.round(px * 9525);
    // All cert logos share the SAME height; width follows aspect ratio (same order as certFiles)
    const certAspect = [691 / 577, 267 / 188, 1, 531 / 376, 1]; // nsf, ce, uaf, images, iaf
    const certH = 60; // fixed height in px for every logo
    const certY = emu(2);
    const startCol = 3; // cols 3-8 = D to I (within 9-column table A-I)
    let drawingPics = `<xdr:oneCellAnchor><xdr:from><xdr:col>0</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>0</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from><xdr:ext cx="${emu(230)}" cy="${emu(65)}"/><xdr:pic><xdr:nvPicPr><xdr:cNvPr id="2" name="Logo"/><xdr:cNvPicPr><a:picLocks noChangeAspect="1"/></xdr:cNvPicPr></xdr:nvPicPr><xdr:blipFill><a:blip r:embed="rId1" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"/><a:stretch><a:fillRect/></a:stretch></xdr:blipFill><xdr:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${emu(230)}" cy="${emu(65)}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></xdr:spPr></xdr:pic><xdr:clientData/></xdr:oneCellAnchor>`;
    // Add cert logos positioned right-side, row 0 — each in its own column slot
    for (let i = 0; i < certImages.length; i++) {
      const col = startCol + i; // one per column
      const rIdNum = i + 2;
      const cy = emu(certH);
      const cx = emu(Math.round(certH * (certAspect[i] ?? 1))); // width from aspect ratio
      drawingPics += `<xdr:oneCellAnchor><xdr:from><xdr:col>${col}</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>0</xdr:row><xdr:rowOff>${certY}</xdr:rowOff></xdr:from><xdr:ext cx="${cx}" cy="${cy}"/><xdr:pic><xdr:nvPicPr><xdr:cNvPr id="${rIdNum + 1}" name="Cert${i + 1}"/><xdr:cNvPicPr><a:picLocks noChangeAspect="1"/></xdr:cNvPicPr></xdr:nvPicPr><xdr:blipFill><a:blip r:embed="rId${rIdNum}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"/><a:stretch><a:fillRect/></a:stretch></xdr:blipFill><xdr:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></xdr:spPr></xdr:pic><xdr:clientData/></xdr:oneCellAnchor>`;
    }
    zip.file("xl/drawings/drawing1.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">${drawingPics}</xdr:wsDr>`);
    // Build rels for all images
    let rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/image1.png"/>`;
    for (let i = 0; i < certImages.length; i++) {
      rels += `<Relationship Id="rId${i + 2}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/${certImages[i].name}"/>`;
    }
    rels += `</Relationships>`;
    zip.file("xl/drawings/_rels/drawing1.xml.rels", rels);
    let wsRels = "";
    try { wsRels = await (zip.file("xl/worksheets/_rels/sheet1.xml.rels")?.async("string") ?? ""); } catch { /* */ }
    if (!wsRels || !wsRels.includes("Relationships")) wsRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing1.xml"/></Relationships>`;
    else wsRels = wsRels.replace("</Relationships>", `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing1.xml"/></Relationships>`);
    zip.file("xl/worksheets/_rels/sheet1.xml.rels", wsRels);
    let sheetXml = await (zip.file("xl/worksheets/sheet1.xml")?.async("string") ?? "");
    if (sheetXml && !sheetXml.includes("<drawing")) { sheetXml = sheetXml.replace("</worksheet>", `<drawing r:id="rId1"/></worksheet>`); zip.file("xl/worksheets/sheet1.xml", sheetXml); }
    let ct = await (zip.file("[Content_Types].xml")?.async("string") ?? "");
    if (ct && !ct.includes('Extension="png"')) ct = ct.replace("</Types>", `<Default Extension="png" ContentType="image/png"/></Types>`);
    if (ct && !ct.includes('Extension="jpg"')) ct = ct.replace("</Types>", `<Default Extension="jpg" ContentType="image/jpeg"/></Types>`);
    if (ct && !ct.includes('Extension="jpeg"')) ct = ct.replace("</Types>", `<Default Extension="jpeg" ContentType="image/jpeg"/></Types>`);
    if (ct && !ct.includes('Extension="webp"')) ct = ct.replace("</Types>", `<Default Extension="webp" ContentType="image/webp"/></Types>`);
    if (ct && !ct.includes("drawing1.xml")) ct = ct.replace("</Types>", `<Override PartName="/xl/drawings/drawing1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/></Types>`);
    if (ct) zip.file("[Content_Types].xml", ct);
    const blob = await zip.generateAsync({ type: "blob", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = fileName; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  } catch (e) {
    console.warn("Image injection failed:", e);
    XLSX.writeFile(wb, fileName);
  }
}

// ── PDF (Matching original Prestair quotation format) ─────────────────────────
async function buildQuotationPDF(props: Props) {
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = 210;
  const ML = 10;
  const MR = 200;
  const CW = MR - ML;
  // Page 1 has NO footer logos, so it can use more vertical space (~70% more of the
  // otherwise-blank footer band). Pages 2+ reserve room for footer logos.
  const PAGE_BOTTOM_P1 = 282;  // page 1: use almost full height (footer band free)
  const PAGE_BOTTOM_REST = 255; // page 2+: leave space for footer logos
  const PAGE_TOP = 12;
  // Returns the bottom limit for the CURRENT page
  const pageBottom = () => {
    const pn = (doc as unknown as { internal: { getNumberOfPages: () => number } }).internal.getNumberOfPages();
    return pn === 1 ? PAGE_BOTTOM_P1 : PAGE_BOTTOM_REST;
  };

  // ── Helper: load raster image as a data URL ───────────────────────────────
  async function loadImg(file: string): Promise<string | null> {
    try {
      const res = await fetch(`/logos/${file}`);
      if (!res.ok) return null;
      const blob = await res.blob();

      return await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(blob);
      });
    } catch {
      return null;
    }
  }

  // Load only raster logos so every addImage call is browser-safe.
  // w/h set to actual image aspect ratio so round logos stay round (not stretched)
  const logoFiles = [
    // All logos share the SAME height (H mm); width follows each image's aspect ratio
    // so nothing looks stretched or unevenly sized. H = 12mm.
    { file: "nsf logo.png", fmt: "PNG",  w: 12 * 691 / 577, h: 12 }, // 691x577
    { file: "ce.jpg",       fmt: "JPEG", w: 12 * 267 / 188, h: 12 }, // 267x188
    { file: "uaf.webp",     fmt: "WEBP", w: 12,             h: 12 }, // square
    { file: "images.png",   fmt: "PNG",  w: 12 * 531 / 376, h: 12 }, // 531x376
    { file: "iaf.png",      fmt: "PNG",  w: 12,             h: 12 }, // 600x600 square
  ];
  const logos: (string | null)[] = [];
  for (const l of logoFiles) logos.push(await loadImg(l.file));

  // ══════════════════════════════════════════════════════════════════════════
  // PAGE 1 HEADER — New Prestair logo
  // Load as ArrayBuffer for direct PNG data injection (avoids lossy canvas re-encoding)
  const prestairLogoUrl = await loadImg("prestair-new.png");
  if (prestairLogoUrl) {
    // Use FAST compression (NONE) to preserve PNG quality in PDF
    // Size: 72mm wide × 25mm tall — proportional to 899×392px source
    doc.addImage(prestairLogoUrl, "PNG", ML - 2, 2, 72, Math.round(72 * 392 / 899), undefined, "FAST");
  }

  // Company details — dark blue
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(26, 58, 107);
  doc.text("Commercial Food Service Equipments", ML, 34);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(60, 60, 60);
  doc.text("B-127 Phase-2, Noida, Uttar Pradesh 201305", ML, 37.5);
  doc.text("India", ML, 41);

  // Certification logos top-right — push to right edge (MR=200)
  // 5 logos: total width = sum of w + 4 gaps of 2mm each
  // Right-align so the LAST logo's right edge sits at the header line end (MR).
  // Add a small overshoot so the visually-padded circular logos align flush with the line.
  const logoGap = 3;
  const rightEdge = MR + 2; // push slightly right to align flush with line
  const totalLogoW = logoFiles.reduce((s, l) => s + l.w, 0) + (logoFiles.length - 1) * logoGap;
  let lx = rightEdge - totalLogoW;
  // Vertically center every logo on a common horizontal centre line so they sit
  // on the same baseline (no "bouncing" look), regardless of individual heights.
  const logoCenterY = 15; // mm — centre line for the logo row
  for (let i = 0; i < logoFiles.length; i++) {
    if (logos[i]) {
      const ly = logoCenterY - logoFiles[i].h / 2; // center each logo on the line
      doc.addImage(logos[i]!, logoFiles[i].fmt, lx, ly, logoFiles[i].w, logoFiles[i].h);
    }
    lx += logoFiles[i].w + logoGap;
  }

  // Horizontal line below header
  doc.setDrawColor(0);
  doc.setLineWidth(0.5);
  doc.line(ML, 45, MR, 45);

  // Date and Quotation No
  let y = 50;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  doc.text(`Date:${fmtDateDisplay(props.date)}`, ML, y);
  doc.text(`Quotation No: ${props.quotationNo}`, MR, y, { align: "right" });

  // Party details
  y += 8;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("M/S: " + props.partyName.toUpperCase(), ML, y);

  // Address from the current form values
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  if (props.partyAddress) {
    const addrLines = doc.splitTextToSize(props.partyAddress, 100);
    doc.text(addrLines, ML, y);
    y += addrLines.length * 4;
  }
  if (props.partyGST) {
    doc.setFont("helvetica", "bold");
    doc.text(`GST: ${props.partyGST}`, ML, y);
    y += 5;
  }

  // Kind Attention
  if (props.attention) {
    y += 2;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text(`Kind Attention: ${props.attention.trim()}`, ML, y);
    y += 5;
  }

  // Subject
  y += 2;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(0, 0, 0);
  const subLines = doc.splitTextToSize(`SUBJECT: ${props.subject}`, CW);
  doc.text(subLines, ML, y);
  y += subLines.length * 4 + 4;

  // ══════════════════════════════════════════════════════════════════════════
  // ITEMS TABLE — matching original format with the additional item detail
  // ══════════════════════════════════════════════════════════════════════════

  // "PART - A" heading (only shown when Part B is enabled)
  if (props.discounts.partBEnabled) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setFillColor(30, 64, 175);
    doc.rect(ML, y, CW, 6, "F");
    doc.setTextColor(255, 255, 255);
    doc.text("PART - A", ML + CW / 2, y + 4.2, { align: "center" });
    doc.setTextColor(0, 0, 0);
    y += 8;
  }

  autoTable(doc, {
    startY: y,
    // Keep bottom margin safe for page 2+ footer logos (drawn later). Page 1's extra
    // free space is used by the totals/terms logic via pageBottom().
    margin: { left: ML, right: ML, bottom: 24 },
    head: [["SL NO", "ITEM\nCODE", "ITEM NAME", "ADDITIONAL\nDESCRIPTION", "SIZE", "H.S.N\nCODE", "QTY", "RATE", "AMOUNT"]],
    body: (() => {
      const body: (string | { content: string; colSpan: number; styles: object })[][] = [];
      let lastSection = "";
      let insideExplicitSection = false;
      let slNo = 0;
      const filteredRows = filterEmptySections(props.rows);
      filteredRows.forEach((r) => {
        if (r.rowType === "section") {
          insideExplicitSection = true;
          const heading = (r.desc || r.section || "Untitled Section").toUpperCase();
          body.push([{
            content: heading,
            colSpan: 9,
            styles: { halign: "center" as const, fontStyle: "bold" as const, fontSize: 8, fillColor: [239, 246, 255], textColor: [30, 64, 175] },
          }] as unknown as string[]);
          lastSection = "";
          return;
        }
        const section = insideExplicitSection
          ? ""
          : (r.section && r.section !== "Custom" ? r.section : detectSection(r.itemCode));
        if (section && section !== lastSection) {
          body.push([{
            content: section.toUpperCase(),
            colSpan: 9,
            styles: { halign: "center" as const, fontStyle: "bold" as const, fontSize: 8, fillColor: [255, 255, 255], textColor: [0, 0, 0] },
          }] as unknown as string[]);
          lastSection = section;
        }
        slNo++;
        body.push([
          String(slNo),
          r.itemCode || "",
          r.desc || "",
          r.additionalColumn || "",
          r.size || "",
          r.hsn || "",
          r.qty || "1",
          r.rate || "NQ",
          r.amt !== null ? fmtNum(r.amt) : "NQ",
        ]);
      });
      return body;
    })(),

    headStyles: {
      fillColor: [200, 200, 200],
      textColor: [0, 0, 0],
      fontStyle: "bold",
      fontSize: 9.5,
      lineWidth: 0.15,
      lineColor: [0, 0, 0],
      halign: "center",
      valign: "middle",
      cellPadding: { top: 2, bottom: 2, left: 1.5, right: 1.5 },
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: [0, 0, 0],
      lineWidth: 0.15,
      lineColor: [0, 0, 0],
      cellPadding: { top: 1.5, bottom: 1.5, left: 1.5, right: 1.5 },
      valign: "middle",
    },
    columnStyles: {
      0: { cellWidth: 10, halign: "center" },
      1: { cellWidth: 14, halign: "center" },
      2: { cellWidth: 16, halign: "center" },
      3: { cellWidth: 58, halign: "left" },
      4: { cellWidth: 28, halign: "center" },
      5: { cellWidth: 18, halign: "center" },
      6: { cellWidth: 10, halign: "center" },
      7: { cellWidth: 16, halign: "center" },
      8: { cellWidth: 20, halign: "center", fontStyle: "bold" },
    },
    rowPageBreak: "avoid",
    tableWidth: CW,
    theme: "grid",
    didParseCell: (data) => {
      if (data.section === "head") {
        data.cell.styles.fillColor = [200, 200, 200];
        data.cell.styles.textColor = [0, 0, 0];
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fontSize = 9.5;
      }
    },
    didDrawPage: (data) => {
      if (data.pageNumber === 1) return;
      // Footer logos on each page
      drawFooterLogos(doc, logos, logoFiles, W, ML, MR);
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let ty = ((doc as any).lastAutoTable?.finalY ?? y + 10) + 0;

  // ══════════════════════════════════════════════════════════════════════════
  // PART A TOTALS — immediately after Part A items
  // ══════════════════════════════════════════════════════════════════════════
  const safeNum = (n: number) => (isNaN(n) || n === null || n === undefined) ? 0 : n;
  const partBEnabled = props.discounts.partBEnabled === true;
  const pctA = safeNum(props.discounts.discountPercentA ?? 0);
  const discountAmountA = Math.round(safeNum(props.gross) * pctA / 100);
  const specialAmt  = safeNum(props.discounts.special.amount);
  const seasonalAmt = safeNum(props.discounts.seasonal.amount);
  const afterDiscountA = Math.max(0, safeNum(props.gross) - discountAmountA - specialAmt); // excludes seasonal
  const finalTotalA    = Math.max(0, afterDiscountA - seasonalAmt);                        // after seasonal
  const effectiveA     = props.discounts.seasonal.enabled ? finalTotalA : afterDiscountA;
  const pctB = safeNum(props.discounts.discountPercentB ?? 0);
  const grossBVal = safeNum(props.grossB ?? 0);
  const discountAmountB = Math.round(grossBVal * pctB / 100);
  const afterDiscountBVal = Math.max(0, grossBVal - discountAmountB);
  const combinedAfterDiscount = effectiveA + (partBEnabled ? afterDiscountBVal : 0);

  // Items table column widths: 10+14+16+58+28+18+10+16 = 170 (cols 0-7), col 8 = 20
  // Totals table must match: label col = 170, amount col = 20 so AMOUNT aligns perfectly
  const TOTAL_LABEL_W = 170;
  const TOTAL_AMT_W = 20;
  const tStyle = {
    columnStyles: { 0: { cellWidth: TOTAL_LABEL_W, halign: "center" as const, fontStyle: "bold" as const }, 1: { cellWidth: TOTAL_AMT_W, halign: "right" as const, fontStyle: "bold" as const } },
    bodyStyles: { fontSize: 8, textColor: [0, 0, 0] as [number, number, number], lineWidth: 0.15, lineColor: [0, 0, 0] as [number, number, number], cellPadding: { top: 1.5, bottom: 1.5, left: 2, right: 2 } },
    tableWidth: CW, theme: "grid" as const,
    margin: { left: ML, right: ML },
  };

  // ── Part A totals ──
  if (ty + 25 > pageBottom()) { doc.addPage(); ty = PAGE_TOP; }
  const partATotals: string[][] = [["TOTAL AMOUNT", fmtNum(safeNum(props.gross))]];
  if (pctA > 0) partATotals.push([`DISCOUNT ${pctA}%`, fmtNum(discountAmountA)]);
  if (props.discounts.special.enabled) partATotals.push(["SPECIAL DISCOUNT", fmtNum(specialAmt)]);
  if (props.discounts.legacyAmount > 0) partATotals.push(["DISCOUNT", fmtNum(safeNum(props.discounts.legacyAmount))]);
  if (pctA > 0 || props.discounts.special.enabled || props.discounts.seasonal.enabled || props.discounts.legacyAmount > 0) {
    // (A) label lagta hai us row par jahan se A ka amount A+B mein jaata hai:
    // seasonal hai -> FINAL TOTAL (A), warna TOTAL AFTER DISCOUNT (A). Only when Part B enabled.
    const afterLabelA = (partBEnabled && !props.discounts.seasonal.enabled) ? " (A)" : "";
    partATotals.push(["TOTAL AFTER DISCOUNT" + afterLabelA, fmtNum(afterDiscountA)]);
  }
  if (props.discounts.seasonal.enabled) partATotals.push(["SEASONAL DISCOUNT", fmtNum(seasonalAmt)]);
  if (props.discounts.seasonal.enabled) partATotals.push(["FINAL TOTAL" + (partBEnabled ? " (A)" : ""), fmtNum(finalTotalA)]);
  autoTable(doc, { startY: ty, body: partATotals, ...tStyle });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ty = ((doc as any).lastAutoTable?.finalY ?? ty + 20) + 0;

  // ══════════════════════════════════════════════════════════════════════════
  // PART B ITEMS + PART B TOTALS (if enabled)
  // ══════════════════════════════════════════════════════════════════════════
  if (partBEnabled && props.partBRows && props.partBRows.length > 0) {
    ty += 2;
    if (ty + 10 > pageBottom()) { doc.addPage(); ty = PAGE_TOP; }
    doc.setFont("helvetica", "bold"); doc.setFontSize(9);
    doc.setFillColor(60, 60, 120); doc.rect(ML, ty, CW, 6, "F");
    doc.setTextColor(255, 255, 255); doc.text("PART - B", ML + CW / 2, ty + 4.2, { align: "center" });
    doc.setTextColor(0, 0, 0); ty += 8;

    autoTable(doc, {
      startY: ty, margin: { left: ML, right: ML },
      head: [["SL NO", "ITEM\nCODE", "ITEM NAME", "ADDITIONAL\nDESCRIPTION", "SIZE", "H.S.N\nCODE", "QTY", "RATE", "AMOUNT"]],
      body: (() => {
        const body: (string | { content: string; colSpan: number; styles: object })[][] = [];
        let slNo = 0;
        const filteredBRows = filterEmptySections(props.partBRows!);
        filteredBRows.forEach((r) => {
          if (r.rowType === "section") {
            body.push([{ content: (r.desc || r.section || "").toUpperCase(), colSpan: 9,
              styles: { halign: "center" as const, fontStyle: "bold" as const, fontSize: 8, fillColor: [239, 246, 255], textColor: [30, 64, 175] },
            }] as unknown as string[]); return;
          }
          slNo++;
          body.push([String(slNo), r.itemCode || "", r.desc || "", r.additionalColumn || "",
            r.size || "", r.hsn || "", r.qty || "1", r.rate || "NQ", r.amt !== null ? fmtNum(r.amt) : "NQ"]);
        });
        return body;
      })(),
      headStyles: { fillColor: [200, 200, 200], textColor: [0, 0, 0], fontStyle: "bold", fontSize: 9.5, lineWidth: 0.15, lineColor: [0, 0, 0], halign: "center", valign: "middle", cellPadding: { top: 2, bottom: 2, left: 1.5, right: 1.5 } },
      bodyStyles: { fontSize: 7.5, textColor: [0, 0, 0], lineWidth: 0.15, lineColor: [0, 0, 0], cellPadding: { top: 1.5, bottom: 1.5, left: 1.5, right: 1.5 }, valign: "middle" },
      columnStyles: { 0: { cellWidth: 10, halign: "center" }, 1: { cellWidth: 14, halign: "center" }, 2: { cellWidth: 16, halign: "center" }, 3: { cellWidth: 58, halign: "left" }, 4: { cellWidth: 28, halign: "center" }, 5: { cellWidth: 18, halign: "center" }, 6: { cellWidth: 10, halign: "center" }, 7: { cellWidth: 16, halign: "center" }, 8: { cellWidth: 20, halign: "center", fontStyle: "bold" } },
      rowPageBreak: "avoid", tableWidth: CW, theme: "grid",
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ty = ((doc as any).lastAutoTable?.finalY ?? ty + 10) + 0;

    // ── Part B totals ── (B) label us row par jahan se B ka amount A+B mein jaata hai
    if (ty + 15 > pageBottom()) { doc.addPage(); ty = PAGE_TOP; }
    // discount hai -> TOTAL AFTER DISCOUNT (B), warna TOTAL AMOUNT (B)
    const partBTotals: string[][] = [["TOTAL AMOUNT" + (pctB > 0 ? "" : " (B)"), fmtNum(grossBVal)]];
    if (pctB > 0) {
      partBTotals.push([`DISCOUNT ${pctB}%`, fmtNum(discountAmountB)]);
      partBTotals.push(["TOTAL AFTER DISCOUNT (B)", fmtNum(afterDiscountBVal)]);
    }
    autoTable(doc, { startY: ty, body: partBTotals, ...tStyle });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ty = ((doc as any).lastAutoTable?.finalY ?? ty + 15) + 0;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // COMBINED TOTALS — A+B, Transport, Packing, GST, Grand Total
  // ══════════════════════════════════════════════════════════════════════════
  if (ty + 30 > pageBottom()) { doc.addPage(); ty = PAGE_TOP; }
  const combinedTotals: string[][] = [];
  if (partBEnabled) combinedTotals.push(["TOTAL AMOUNT (A+B)", fmtNum(combinedAfterDiscount)]);
  combinedTotals.push(["TRANSPORTATION CHARGES", props.discounts.transportationAmount === 0 ? "As Per Actuals" : fmtNum(safeNum(props.discounts.transportationAmount))]);
  combinedTotals.push(["PACKING CHARGES", props.discounts.packingAmount === 0 ? "As Per Actuals" : fmtNum(safeNum(props.discounts.packingAmount))]);
  combinedTotals.push(["TAXABLE VALUE", fmtNum(safeNum(combinedAfterDiscount + props.discounts.transportationAmount + props.discounts.packingAmount))]);
  if (props.discounts.gstEnabled !== false) {
    combinedTotals.push(["GST 18%", fmtNum(safeNum(props.gst))]);
    combinedTotals.push(["GRAND TOTAL", fmtNum(safeNum(props.grandTotal))]);
  }
  autoTable(doc, { startY: ty, body: combinedTotals, ...tStyle });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ty = ((doc as any).lastAutoTable?.finalY ?? ty + 30) + 8;

  // ══════════════════════════════════════════════════════════════════════════
  // TERMS & CONDITIONS — matching original style
  // ══════════════════════════════════════════════════════════════════════════
  if (ty + 10 > pageBottom()) { doc.addPage(); ty = PAGE_TOP; }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text("Terms & Conditions:", ML, ty);
  doc.setLineWidth(0.4);
  doc.line(ML, ty + 1, ML + 45, ty + 1); // underline
  ty += 6;

  doc.setFontSize(7.5);
  doc.setTextColor(0, 0, 0);

  TERMS.forEach((line) => {
    // Bold the numbered headings
    const isBold = /^\d+\./.test(line.trim()) && !line.trim().startsWith("  ");
    doc.setFont("helvetica", isBold ? "bold" : "normal");
    const split = doc.splitTextToSize(line, CW - 4);
    const blockH = split.length * 3.6 + 1;
    if (ty + blockH > pageBottom()) {
      doc.addPage();
      ty = PAGE_TOP;
    }
    doc.text(split, ML + 2, ty);
    ty += blockH;
  });

  // ══════════════════════════════════════════════════════════════════════════
  // BANK DETAILS — matching original
  // ══════════════════════════════════════════════════════════════════════════
  ty += 6;
  if (ty + 40 > pageBottom()) { doc.addPage(); ty = PAGE_TOP; }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  doc.text("BANK DETAILS", ML, ty);
  doc.setLineWidth(0.4);
  doc.line(ML, ty + 1, ML + 32, ty + 1);
  ty += 5;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  const bankLines = [
    "ACCOUNT NAME- PRESTAIR SYSTEMS LLP",
    "ACCOUNT NO - 4513086230",
    "ACCOUNT TYPE- CURRENT ACCOUNT",
    "IFSC CODE-KKBK0000154",
    "BANK - KOTAK MAHINDRA BANK",
    "BRANCH - SECTOR 51 NOIDA",
    "",
    "GST NO-09AATFP8342B1ZX",
  ];
  bankLines.forEach((line) => {
    doc.text(line, ML, ty);
    ty += 4;
  });

  // ══════════════════════════════════════════════════════════════════════════
  // SIGNATURE — "For Prestair Systems LLP"
  // ══════════════════════════════════════════════════════════════════════════
  ty += 8;
  if (ty + 20 > pageBottom()) { doc.addPage(); ty = PAGE_TOP; }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text("For Prestair Systems LLP", ML, ty);

  // ══════════════════════════════════════════════════════════════════════════
  // FOOTER LOGOS — page 2 onwards only (page 1 has header logos already)
  const pageCount = (doc as unknown as { internal: { getNumberOfPages: () => number } }).internal.getNumberOfPages();
  for (let i = 2; i <= pageCount; i++) {
    doc.setPage(i);
    drawFooterLogos(doc, logos, logoFiles, W, ML, MR);
  }

  return doc;
}

function quotationFileName(props: Props, extension: "pdf" | "xlsx") {
  const base = (props.quotationNo || props.partyName).replace(/[/\\?%*:|"<>]/g, "-");
  return `Quotation_${base}_${props.date}.${extension}`;
}

async function downloadPDF(props: Props) {
  const doc = await buildQuotationPDF(props);
  doc.save(quotationFileName(props, "pdf"));
}

function propsFromSavedQuotation(quotation: SavedQuotation): Props {
  return {
    quotation,
    partyName: quotation.partyName,
    partyAddress: quotation.partyAddress,
    partyGST: quotation.partyGST,
    attention: quotation.attention,
    quotationNo: quotation.quotationNo,
    date: quotation.date,
    subject: quotation.subject,
    rows: quotation.rows.map((row, index) => ({
      rowType: row.rowType,
      slNo: row.rowType === "section" ? "" : String(quotation.rows.slice(0, index + 1).filter((entry) => entry.rowType !== "section").length),
      itemCode: row.id,
      desc: row.desc,
      size: row.size,
      hsn: row.hsn,
      qty: String(row.qty),
      additionalColumn: row.additionalColumn,
      rate: row.rate === null ? "" : String(row.rate),
      amt: row.amt,
      section: row.section,
    })),
    gross: quotation.gross,
    discounts: quotation.discounts,
    afterDiscount: quotation.afterDiscount,
    gst: quotation.gst,
    grandTotal: quotation.grandTotal,
    partBRows: quotation.partBRows?.map((row, index) => ({
      rowType: row.rowType,
      slNo: row.rowType === "section" ? "" : String((quotation.partBRows ?? []).slice(0, index + 1).filter((entry) => entry.rowType !== "section").length),
      itemCode: row.id,
      desc: row.desc,
      size: row.size,
      hsn: row.hsn,
      qty: String(row.qty),
      additionalColumn: row.additionalColumn,
      rate: row.rate === null ? "" : String(row.rate),
      amt: row.amt,
      section: row.section,
    })),
    grossB: quotation.partBRows?.reduce((sum, row) => sum + (row.amt ?? 0), 0),
    afterDiscountB: (() => {
      const gB = quotation.partBRows?.reduce((sum, row) => sum + (row.amt ?? 0), 0) ?? 0;
      const pctB = quotation.discounts.discountPercentB ?? 0;
      return Math.max(0, gB - Math.round(gB * pctB / 100));
    })(),
  };
}

export async function printSavedQuotation(quotation: SavedQuotation, printWindow: Window) {
  if (printWindow.closed) throw new Error("The print window was closed.");
  const doc = await buildQuotationPDF(propsFromSavedQuotation(quotation));
  doc.autoPrint();
  const pdfUrl = URL.createObjectURL(doc.output("blob"));
  printWindow.location.replace(pdfUrl);
  window.setTimeout(() => URL.revokeObjectURL(pdfUrl), 120_000);
}

// Helper: draw footer logos centered at bottom of page
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function drawFooterLogos(doc: any, logos: (string | null)[], logoFiles: { file: string; fmt: string; w: number; h: number }[], W: number, ML: number, MR: number) {
  const footerCenterY = 280; // centre line for footer logo row
  const gap = 5;
  const totalW = logoFiles.reduce((s, l) => s + l.w, 0) + (logoFiles.length - 1) * gap;
  let x = (W - totalW) / 2;
  for (let i = 0; i < logoFiles.length; i++) {
    if (logos[i]) {
      const ly = footerCenterY - logoFiles[i].h / 2; // vertically centre each logo
      doc.addImage(logos[i]!, logoFiles[i].fmt, x, ly, logoFiles[i].w, logoFiles[i].h);
    }
    x += logoFiles[i].w + gap;
  }
  // Thin line above logos
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.2);
  doc.line(ML, footerCenterY - logoFiles[0].h / 2 - 1.5, MR, footerCenterY - logoFiles[0].h / 2 - 1.5);
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function QuotationDownload(props: Props) {
  const [pdfLoading, setPdfLoading] = useState(false);
  const [excelLoading, setExcelLoading] = useState(false);

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={async () => {
          setPdfLoading(true);
          try { await downloadPDF(props); }
          catch (e) { console.error("PDF Error:", e); alert("PDF generation failed: " + (e instanceof Error ? e.message : String(e))); }
          finally { setPdfLoading(false); }
        }}
        disabled={pdfLoading}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-red-600 hover:bg-red-700 active:scale-95 transition-all disabled:opacity-60 shadow"
        title="Download PDF"
      >
        {pdfLoading
          ? <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
          : "📄"} PDF
      </button>
      <button
        onClick={async () => {
          setExcelLoading(true);
          try { await downloadExcel(props); }
          finally { setExcelLoading(false); }
        }}
        disabled={excelLoading}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-green-700 hover:bg-green-800 active:scale-95 transition-all disabled:opacity-60 shadow"
        title="Download Excel"
      >
        {excelLoading
          ? <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
          : "📊"} Excel
      </button>
    </div>
  );
}
