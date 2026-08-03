"use client";

import { useState } from "react";
import { SavedQuotation } from "@/context/QuotationContext";
import { QuotationDiscounts } from "@/lib/quotationAudit";
import { PRESTAIR_LOGO_BASE64 } from "@/lib/prestairLogoData";

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
};

type RowData = {
  rowType?: "item" | "section";
  slNo: string; itemCode: string; desc: string; size: string;
  hsn: string; qty: string; additionalColumn: string; rate: string; amt: number | null;
  section?: string;
};

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
  "1. Rates: - valid for 10 days.",
  "2. Delivery Period: - 8 WEEKS. (However, under unavoidable circumstances like natural calamities, war strikes etc., we shall not be liable for any cancellation or delay in meeting delivery date.)",
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

  const hasDiscount = props.discounts.seasonal.enabled || props.discounts.special.enabled || props.discounts.legacyAmount > 0;

  // Style definitions
  const boldStyle = { font: { bold: true } };
  const headerStyle = { font: { bold: true, sz: 11 }, fill: { fgColor: { rgb: "1F4E79" } }, font2: { color: { rgb: "FFFFFF" } } };
  const sectionStyle = { font: { bold: true, sz: 10 }, fill: { fgColor: { rgb: "C6EFCE" } }, alignment: { horizontal: "center" } };
  const totalStyle = { font: { bold: true }, fill: { fgColor: { rgb: "FFFFCC" } } };
  const companyStyle = { font: { bold: true, sz: 14 } };

  // ── Build rows ──────────────────────────────────────────────────────────────
  type CellVal = string | number | { v: string | number; s: object };
  const data: CellVal[][] = [];
  const merges: { s: { r: number; c: number }; e: { r: number; c: number } }[] = [];
  let r = 0;

  // Helper to create styled cell
  const sc = (v: string | number, s: object): { v: string | number; s: object } => ({ v, s });

  // Company header
  data.push([sc("", {}), sc("PRESTAIR SYSTEMS LLP", { font: { bold: true, sz: 16 } }), "", "", "", "", "", "", ""]);
  merges.push({ s: { r, c: 1 }, e: { r, c: 8 } }); r++;
  data.push(["", sc("Commercial Food Service Equipments | Since 1982", { font: { sz: 10, italic: true } }), "", "", "", "", "", "", ""]);
  merges.push({ s: { r, c: 1 }, e: { r, c: 8 } }); r++;
  data.push(["", "B-127 Phase-2, Noida, Uttar Pradesh 201305 | GST: 09AATFP8342B1ZX", "", "", "", "", "", "", ""]);
  merges.push({ s: { r, c: 1 }, e: { r, c: 8 } }); r++;
  data.push([]); r++;

  // Date & Quotation No - BOLD
  data.push([sc(`Date: ${fmtDateDisplay(props.date)}`, boldStyle), "", "", "", "", "", "", sc(`Quotation No: ${props.quotationNo}`, boldStyle), ""]);
  r++;
  data.push([]); r++;

  // Party details - BOLD
  data.push(["", sc(`M/S: ${props.partyName}`, { font: { bold: true, sz: 11 } }), "", "", "", "", "", "", ""]);
  merges.push({ s: { r, c: 1 }, e: { r, c: 8 } }); r++;
  if (props.partyAddress) {
    data.push(["", sc(props.partyAddress, boldStyle), "", "", "", "", "", "", ""]);
    merges.push({ s: { r, c: 1 }, e: { r, c: 8 } }); r++;
  }
  if (props.partyGST) {
    data.push(["", sc(`GST: ${props.partyGST}`, boldStyle), "", "", "", "", "", "", ""]);
    merges.push({ s: { r, c: 1 }, e: { r, c: 8 } }); r++;
  }
  data.push([]); r++;
  if (props.attention) {
    data.push(["", sc(`Kind Attention: ${props.attention}`, boldStyle), "", "", "", "", "", "", ""]);
    merges.push({ s: { r, c: 1 }, e: { r, c: 8 } }); r++;
  }
  data.push(["", sc(`SUBJECT: ${props.subject}`, boldStyle), "", "", "", "", "", "", ""]);
  merges.push({ s: { r, c: 1 }, e: { r, c: 8 } }); r++;
  data.push([]); r++;

  // Table header - BOLD with blue background
  const tableHeaderStyle = { font: { bold: true, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "1F4E79" } }, alignment: { horizontal: "center" }, border: { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } } };
  data.push([
    sc("SL NO", tableHeaderStyle),
    sc("ITEM CODE", tableHeaderStyle),
    sc("ITEM NAME", tableHeaderStyle),
    sc("ADDITIONAL DESCRIPTION", tableHeaderStyle),
    sc("SIZE", tableHeaderStyle),
    sc("HSN CODE", tableHeaderStyle),
    sc("QTY", tableHeaderStyle),
    sc("RATE", tableHeaderStyle),
    sc("AMOUNT", tableHeaderStyle),
  ]);
  r++;

  // Item rows
  const borderStyle = { border: { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } } };
  for (const row of props.rows) {
    if (row.rowType === "section") {
      // Section header - GREEN background
      const heading = (row.desc || row.section || "").toUpperCase();
      const secStyle = { font: { bold: true }, fill: { fgColor: { rgb: "C6EFCE" } }, alignment: { horizontal: "center" }, border: { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } } };
      data.push([sc(heading, secStyle), "", "", "", "", "", "", "", ""]);
      merges.push({ s: { r, c: 0 }, e: { r, c: 8 } });
      r++;
    } else {
      data.push([
        sc(row.slNo, borderStyle),
        sc(row.itemCode, borderStyle),
        sc(row.desc, borderStyle),
        sc(row.additionalColumn, borderStyle),
        sc(row.size, borderStyle),
        sc(row.hsn, borderStyle),
        sc(row.qty || "1", borderStyle),
        sc(row.rate || "NQ", borderStyle),
        sc(row.amt !== null ? row.amt : "NQ", borderStyle),
      ]);
      r++;
    }
  }

  // Totals - YELLOW background
  const totStyle = { font: { bold: true }, fill: { fgColor: { rgb: "FFFFCC" } }, border: { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } } };
  data.push(["", "", "", "", "", "", "", sc("TOTAL", totStyle), sc(props.gross, totStyle)]); r++;
  if (props.discounts.seasonal.enabled) {
    data.push(["", "", "", "", "", "", "", sc("LESS- SEASONAL DISCOUNT", totStyle), sc(props.discounts.seasonal.amount, totStyle)]); r++;
  }
  if (props.discounts.special.enabled) {
    data.push(["", "", "", "", "", "", "", sc("LESS- SPECIAL DISCOUNT", totStyle), sc(props.discounts.special.amount, totStyle)]); r++;
  }
  if (props.discounts.legacyAmount > 0) {
    data.push(["", "", "", "", "", "", "", sc("LESS- DISCOUNT", totStyle), sc(props.discounts.legacyAmount, totStyle)]); r++;
  }
  if (hasDiscount) {
    data.push(["", "", "", "", "", "", "", sc("TOTAL AFTER DISCOUNT", totStyle), sc(props.afterDiscount, totStyle)]); r++;
  }
  data.push(["", "", "", "", "", "", "", sc("GST 18%", totStyle), sc(props.gst, totStyle)]); r++;
  const grandStyle = { font: { bold: true, sz: 11 }, fill: { fgColor: { rgb: "FFD700" } }, border: { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } } };
  data.push(["", "", "", "", "", "", "", sc("GRAND TOTAL", grandStyle), sc(props.grandTotal, grandStyle)]); r++;
  data.push(["", "", "", "", "", "", "", "TRANSPORTATION CHARGES AS ACTUAL", ""]); r++;
  data.push([]); r++;

  // Terms & Conditions
  data.push(["", sc("Terms & Conditions:", { font: { bold: true, sz: 10, underline: true } }), "", "", "", "", "", "", ""]);
  merges.push({ s: { r, c: 1 }, e: { r, c: 8 } }); r++;
  for (const term of TERMS) {
    data.push(["", term, "", "", "", "", "", "", ""]);
    merges.push({ s: { r, c: 1 }, e: { r, c: 8 } }); r++;
  }
  data.push([]); r++;

  // Bank Details
  data.push(["", sc("BANK DETAILS", { font: { bold: true, sz: 10, underline: true } }), "", "", "", "", "", "", ""]);
  merges.push({ s: { r, c: 1 }, e: { r, c: 8 } }); r++;
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
  for (const line of bankLines) {
    data.push(["", sc(line, boldStyle), "", "", "", "", "", "", ""]);
    merges.push({ s: { r, c: 1 }, e: { r, c: 8 } }); r++;
  }
  data.push([]); r++;
  data.push([]); r++;
  data.push(["", sc("For Prestair Systems LLP", { font: { bold: true, sz: 11 } }), "", "", "", "", "", "", ""]);
  merges.push({ s: { r, c: 1 }, e: { r, c: 8 } }); r++;

  // ── Create worksheet ────────────────────────────────────────────────────────
  const ws = XLSX.utils.aoa_to_sheet(data);
  ws["!merges"] = merges;

  ws["!cols"] = [
    { wch: 6 },   // SL NO
    { wch: 12 },  // ITEM CODE
    { wch: 32 },  // ITEM NAME
    { wch: 34 },  // ADDITIONAL DESCRIPTION
    { wch: 16 },  // SIZE
    { wch: 10 },  // HSN CODE
    { wch: 5 },   // QTY
    { wch: 12 },  // RATE
    { wch: 14 },  // AMOUNT
  ];

  ws["!pageSetup"] = {
    paperSize: 9,
    orientation: "portrait",
    fitToWidth: 1,
    fitToHeight: 0,
    scale: 75,
  };

  ws["!margins"] = {
    left: 0.3,
    right: 0.3,
    top: 0.7,
    bottom: 0.7,
    header: 0.3,
    footer: 0.3,
  };

  XLSX.utils.book_append_sheet(wb, ws, "Quotation");
  XLSX.writeFile(wb, `Quotation_${(props.quotationNo || props.partyName).replace(/[/\\?%*:|"<>]/g, "-")}_${props.date}.xlsx`);
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
  const PAGE_BOTTOM = 272;
  const PAGE_TOP = 12;

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
  const logoFiles = [
    { file: "uaf.webp", fmt: "WEBP", w: 9, h: 9 },
    { file: "ce.jpg", fmt: "JPEG", w: 9, h: 9 },
    { file: "images.png", fmt: "PNG", w: 9, h: 9 },
    { file: "iaf.png", fmt: "PNG", w: 9, h: 9 },
    { file: "gacb.png", fmt: "PNG", w: 9, h: 9 },
    { file: "iso.png", fmt: "PNG", w: 9, h: 9 },
  ];
  // Load Prestair logo from embedded base64 (guaranteed to work)
  const prestairLogo = PRESTAIR_LOGO_BASE64;
  const logos: (string | null)[] = [];
  for (const l of logoFiles) logos.push(await loadImg(l.file));

  // ══════════════════════════════════════════════════════════════════════════
  // PAGE 1 HEADER — matching original exactly
  // ══════════════════════════════════════════════════════════════════════════

  // Prestair Systems LLP logo — top-left without border
  // Use full data URI directly with jsPDF
  try {
    doc.addImage(prestairLogo, "PNG", ML, 4, 55, 18);
  } catch (e) {
    console.error("Logo addImage failed:", e);
    doc.setFont("helvetica", "bolditalic");
    doc.setFontSize(17);
    doc.setTextColor(37, 99, 235);
    doc.text("Prestair", ML + 3, 12);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text("Systems LLP  |  SINCE 1982", ML + 3, 19);
  }

  // Company details under the logo.
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(37, 99, 235);
  doc.text("Commercial Food Service Equipments", ML, 25.5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(60, 60, 60);
  doc.text("B-127 Phase-2, Noida, Uttar Pradesh 201305", ML, 29);
  doc.text("India", ML, 32);

  // Certification logos top-right, without an enclosing border.
  const logoBoxX = 130;
  let lx = logoBoxX + 3;
  for (let i = 0; i < logoFiles.length; i++) {
    if (logos[i]) {
      doc.addImage(logos[i]!, logoFiles[i].fmt, lx, 6, logoFiles[i].w, logoFiles[i].h);
    }
    lx += logoFiles[i].w + 2.5;
  }

  // Horizontal line below header
  doc.setDrawColor(0);
  doc.setLineWidth(0.5);
  doc.line(ML, 35, MR, 35);

  // Date and Quotation No
  let y = 40;
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
  autoTable(doc, {
    startY: y,
    margin: { left: ML, right: ML },
    head: [["SL NO", "ITEM NAME", "ADDITIONAL\nDESCRIPTION", "SIZE", "H.S.N\nCODE", "QTY", "RATE", "AMOUNT"]],
    body: (() => {
      const body: (string | { content: string; colSpan: number; styles: object })[][] = [];
      let lastSection = "";
      let insideExplicitSection = false;
      props.rows.forEach((r) => {
        if (r.rowType === "section") {
          insideExplicitSection = true;
          const heading = (r.desc || r.section || "Untitled Section").toUpperCase();
          body.push([{
            content: heading,
            colSpan: 8,
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
            colSpan: 8,
            styles: { halign: "center" as const, fontStyle: "bold" as const, fontSize: 8, fillColor: [255, 255, 255], textColor: [0, 0, 0] },
          }] as unknown as string[]);
          lastSection = section;
        }
        body.push([
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
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      fontStyle: "bold",
      fontSize: 7.5,
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
      0: { cellWidth: 12, halign: "center", fontStyle: "bold" },
      1: { cellWidth: 26, halign: "center" },
      2: { cellWidth: 72, halign: "left" },
      3: { cellWidth: 22, halign: "center" },
      4: { cellWidth: 14, halign: "center" },
      5: { cellWidth: 10, halign: "center" },
      6: { cellWidth: 16, halign: "center" },
      7: { cellWidth: 18, halign: "center", fontStyle: "bold" },
    },
    tableWidth: CW,
    theme: "grid",
    didDrawPage: (data) => {
      if (data.pageNumber === 1) return;
      // Footer logos on each page
      drawFooterLogos(doc, logos, logoFiles, W, ML, MR);
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let ty = ((doc as any).lastAutoTable?.finalY ?? y + 10) + 0;

  // ══════════════════════════════════════════════════════════════════════════
  // TOTALS — right-aligned, matching original
  // ══════════════════════════════════════════════════════════════════════════
  const safeNum = (n: number) => (isNaN(n) || n === null || n === undefined) ? 0 : n;

  if (ty + 50 > PAGE_BOTTOM) { doc.addPage(); ty = PAGE_TOP; }

  // Totals using autoTable for clean borders — 2 explicit columns matching items table width
  autoTable(doc, {
    startY: ty,
    margin: { left: ML, right: ML },
    body: [
      ["TOTAL AMOUNT", fmtNum(safeNum(props.gross))],
      ...(props.discounts.seasonal.enabled ? [["SEASONAL DISCOUNT", fmtNum(safeNum(props.discounts.seasonal.amount))]] : []),
      ...(props.discounts.special.enabled ? [["SPECIAL DISCOUNT", fmtNum(safeNum(props.discounts.special.amount))]] : []),
      ...(props.discounts.legacyAmount > 0 ? [["DISCOUNT", fmtNum(safeNum(props.discounts.legacyAmount))]] : []),
      ...((props.discounts.seasonal.enabled || props.discounts.special.enabled || props.discounts.legacyAmount > 0)
        ? [["TOTAL AFTER DISCOUNT", fmtNum(safeNum(props.afterDiscount))]]
        : []),
      ["TRANSPORTATION CHARGES", fmtNum(safeNum(props.discounts.transportationAmount))],
      ["PACKING CHARGES", fmtNum(safeNum(props.discounts.packingAmount))],
      ["TAXABLE VALUE BEFORE GST", fmtNum(safeNum(props.afterDiscount + props.discounts.transportationAmount + props.discounts.packingAmount))],
      ["GST 18%", fmtNum(safeNum(props.gst))],
      ["GRAND TOTAL", fmtNum(safeNum(props.grandTotal))],
    ],
    columnStyles: {
      0: { cellWidth: CW - 18, halign: "center", fontStyle: "bold" },
      1: { cellWidth: 18, halign: "right", fontStyle: "bold" },
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [0, 0, 0],
      lineWidth: 0.15,
      lineColor: [0, 0, 0],
      cellPadding: { top: 1.5, bottom: 1.5, left: 2, right: 2 },
    },
    tableWidth: CW,
    theme: "grid",
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ty = ((doc as any).lastAutoTable?.finalY ?? ty + 30) + 8;

  // ══════════════════════════════════════════════════════════════════════════
  // TERMS & CONDITIONS — matching original style
  // ══════════════════════════════════════════════════════════════════════════
  if (ty + 10 > PAGE_BOTTOM) { doc.addPage(); ty = PAGE_TOP; }

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
    if (ty + blockH > PAGE_BOTTOM) {
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
  if (ty + 40 > PAGE_BOTTOM) { doc.addPage(); ty = PAGE_TOP; }

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
  if (ty + 20 > PAGE_BOTTOM) { doc.addPage(); ty = PAGE_TOP; }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text("For Prestair Systems LLP", ML, ty);

  // ══════════════════════════════════════════════════════════════════════════
  // FOOTER LOGOS — on every page, centered at bottom
  // ══════════════════════════════════════════════════════════════════════════
  const pageCount = (doc as unknown as { internal: { getNumberOfPages: () => number } }).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
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
  const footerY = 286;
  const gap = 4;
  const totalW = logoFiles.reduce((s, l) => s + l.w, 0) + (logoFiles.length - 1) * gap;
  let x = (W - totalW) / 2;
  for (let i = 0; i < logoFiles.length; i++) {
    if (logos[i]) {
      doc.addImage(logos[i]!, logoFiles[i].fmt, x, footerY, logoFiles[i].w, logoFiles[i].h);
    }
    x += logoFiles[i].w + gap;
  }
  // Thin line above logos
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.2);
  doc.line(ML, footerY - 1.5, MR, footerY - 1.5);
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
