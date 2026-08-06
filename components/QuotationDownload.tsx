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
  const th = { font: { bold: true, sz: 12, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "1F4E79" } }, alignment: { horizontal: "center", wrapText: true }, border: { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } } };
  data.push([sc("SL NO", th), sc("ITEM CODE", th), sc("ITEM NAME", th), sc("ADDITIONAL DESCRIPTION", th), sc("SIZE", th), sc("HSN CODE", th), sc("QTY", th), sc("RATE", th), sc("AMOUNT", th)]); r++;

  // Item rows
  for (const row of props.rows) {
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
  const pushT = (label: string, amount: number, style: object) => { data.push(["", "", "", "", "", sc(label, style), sc("", style), sc("", style), sc(amount, style)]); merges.push({ s: { r, c: 5 }, e: { r, c: 7 } }); r++; };
  pushT("TOTAL AMOUNT", safeNum(props.gross), ts);
  if (props.discounts.seasonal.enabled) pushT("SEASONAL DISCOUNT", safeNum(props.discounts.seasonal.amount), ts);
  if (props.discounts.special.enabled) pushT("SPECIAL DISCOUNT", safeNum(props.discounts.special.amount), ts);
  if (props.discounts.legacyAmount > 0) pushT("DISCOUNT", safeNum(props.discounts.legacyAmount), ts);
  if (hasDiscount) pushT("TOTAL AFTER DISCOUNT", safeNum(props.afterDiscount), ts);
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
  pushT("TAXABLE VALUE BEFORE GST", safeNum(props.afterDiscount + props.discounts.transportationAmount + props.discounts.packingAmount), ts);
  pushT("GST 18%", safeNum(props.gst), ts);
  const gs = { font: { bold: true, sz: 11 }, fill: { fgColor: { rgb: "FFD700" } }, alignment: { horizontal: "center" }, border: { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } } };
  pushT("GRAND TOTAL", safeNum(props.grandTotal), gs);
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
  ws["!rows"] = [{ hpt: 20 }, { hpt: 20 }, { hpt: 20 }]; // 3 rows for logo

  XLSX.utils.book_append_sheet(wb, ws, "Quotation");

  // Save with logo image injected into the xlsx zip
  const fileName = `Quotation_${(props.quotationNo || props.partyName).replace(/[/\\?%*:|"<>]/g, "-")}_${props.date}.xlsx`;
  try {
    const logoRes = await fetch("/logos/prestair-inverted.png");
    if (!logoRes.ok) throw new Error("no logo");
    const logoBytes = new Uint8Array(await logoRes.arrayBuffer());
    const wbOut: ArrayBuffer = XLSX.write(wb, { type: "array", bookType: "xlsx" });
    const JSZip = (await import("jszip")).default;
    const zip = await JSZip.loadAsync(wbOut);
    zip.file("xl/media/image1.png", logoBytes);

    // Load certification logos
    const certFiles = ["uaf.webp", "ce.jpg", "images.png", "iaf.png", "gacb.png", "iso.png"];
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
    // Build drawing XML with all images
    const certSize = emu(45); // each cert logo ~45px
    const certY = 0;
    const startCol = 5; // Start from HSN column area (right side)
    let drawingPics = `<xdr:oneCellAnchor><xdr:from><xdr:col>0</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>0</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from><xdr:ext cx="${emu(180)}" cy="${emu(50)}"/><xdr:pic><xdr:nvPicPr><xdr:cNvPr id="2" name="Logo"/><xdr:cNvPicPr><a:picLocks noChangeAspect="1"/></xdr:cNvPicPr></xdr:nvPicPr><xdr:blipFill><a:blip r:embed="rId1" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"/><a:stretch><a:fillRect/></a:stretch></xdr:blipFill><xdr:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${emu(180)}" cy="${emu(50)}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></xdr:spPr></xdr:pic><xdr:clientData/></xdr:oneCellAnchor>`;
    // Add cert logos positioned right-side, row 0
    for (let i = 0; i < certImages.length; i++) {
      const col = startCol + Math.floor(i * 0.7); // spread across cols 5-8
      const colOff = (i % 2 === 0) ? 0 : emu(14);
      const rIdNum = i + 2;
      drawingPics += `<xdr:oneCellAnchor><xdr:from><xdr:col>${col}</xdr:col><xdr:colOff>${colOff}</xdr:colOff><xdr:row>0</xdr:row><xdr:rowOff>${certY}</xdr:rowOff></xdr:from><xdr:ext cx="${certSize}" cy="${certSize}"/><xdr:pic><xdr:nvPicPr><xdr:cNvPr id="${rIdNum + 1}" name="Cert${i + 1}"/><xdr:cNvPicPr><a:picLocks noChangeAspect="1"/></xdr:cNvPicPr></xdr:nvPicPr><xdr:blipFill><a:blip r:embed="rId${rIdNum}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"/><a:stretch><a:fillRect/></a:stretch></xdr:blipFill><xdr:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${certSize}" cy="${certSize}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></xdr:spPr></xdr:pic><xdr:clientData/></xdr:oneCellAnchor>`;
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
  const logos: (string | null)[] = [];
  for (const l of logoFiles) logos.push(await loadImg(l.file));

  // ══════════════════════════════════════════════════════════════════════════
  // PAGE 1 HEADER — Inverted logo from prestair-inverted.png
  // ══════════════════════════════════════════════════════════════════════════

  // Load the inverted Prestair logo image
  const prestairLogo = await loadImg("prestair-inverted.png");
  if (prestairLogo) {
    doc.addImage(prestairLogo, "PNG", ML - 2, 4, 55, 18);
  }

  // Company details — dark blue
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(26, 58, 107);
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
    head: [["SL NO", "ITEM\nCODE", "ITEM NAME", "ADDITIONAL\nDESCRIPTION", "SIZE", "H.S.N\nCODE", "QTY", "RATE", "AMOUNT"]],
    body: (() => {
      const body: (string | { content: string; colSpan: number; styles: object })[][] = [];
      let lastSection = "";
      let insideExplicitSection = false;
      let slNo = 0;
      props.rows.forEach((r) => {
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
      fillColor: [31, 78, 121],
      textColor: [255, 255, 255],
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
      ["TRANSPORTATION CHARGES", props.discounts.transportationAmount === 0 ? "As Per Actuals" : fmtNum(safeNum(props.discounts.transportationAmount))],
      ["PACKING CHARGES", props.discounts.packingAmount === 0 ? "As Per Actuals" : fmtNum(safeNum(props.discounts.packingAmount))],
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
