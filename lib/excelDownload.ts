// Excel download helper — uses xlsx-js-style for formatting + JSZip for logo image injection
import type { QuotationDiscounts } from "@/lib/quotationAudit";

type RowData = {
  rowType?: "item" | "section";
  slNo: string; itemCode: string; desc: string; size: string;
  hsn: string; qty: string; additionalColumn: string; rate: string; amt: number | null;
  section?: string;
};

type ExcelProps = {
  partyName: string; partyAddress: string; partyGST: string; attention: string;
  quotationNo: string; date: string; subject: string; rows: RowData[];
  gross: number; discounts: QuotationDiscounts; afterDiscount: number; gst: number; grandTotal: number;
};

function fmtDateDisplay(dateStr: string): string {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-");
  if (!y || !m || !d) return dateStr;
  return `${d}/${m}/${y}`;
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
  "13. Installation- Installation Requirement: Exact utility requirements (eg. Electrical, gas, steam connections & load at site) shall be advised after receipt of confirmed purchase order.",
  "14. Warranty Period: (a) 12 months by the manufacture for defective parts from the date of invoicing. (b) Exclude consumables and wear & tear parts.",
  "15. Inspections: All equipment/material shall be dispatched only after inspection by your representative at our works.",
  "16. General Specifications: All Frame Work SS Angle, Tops 16 Swg SS 304, Sinks 14 Swg 304, Legs 40x40mm SS Pipe.",
];

export async function downloadExcel(props: ExcelProps) {
  const XLSX = await import("xlsx-js-style");
  const wb = XLSX.utils.book_new();

  const hasDiscount = props.discounts.seasonal.enabled || props.discounts.special.enabled || props.discounts.legacyAmount > 0;
  const safeNum = (n: number) => (isNaN(n) || n === null || n === undefined) ? 0 : n;
  const boldStyle = { font: { bold: true }, alignment: { wrapText: true } };
  const cBorder = { alignment: { wrapText: true, vertical: "top", horizontal: "center" }, border: { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } } };
  const lBorder = { alignment: { wrapText: true, vertical: "top" }, border: { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } } };
  type CellVal = string | number | { v: string | number; s: object };
  const data: CellVal[][] = [];
  const merges: { s: { r: number; c: number }; e: { r: number; c: number } }[] = [];
  let r = 0;
  const sc = (v: string | number, s: object): { v: string | number; s: object } => ({ v, s });

  // Rows 0-1: logo area
  data.push(["", "", "", "", "", "", "", "", ""]); r++;
  data.push(["", "", "", "", "", "", "", "", ""]); r++;
  // Row 2: company details
  data.push([sc("Commercial Food Service Equipments", { font: { bold: true, sz: 8, color: { rgb: "1A3A6B" } } }), "", "", sc("B-127 Phase-2, Noida, UP 201305 | GST: 09AATFP8342B1ZX", { font: { sz: 8 } }), "", "", "", "", ""]);
  merges.push({ s: { r, c: 0 }, e: { r, c: 2 } }); merges.push({ s: { r, c: 3 }, e: { r, c: 8 } }); r++;
  data.push([]); r++;
  // Date & QN
  data.push([sc(`Date: ${fmtDateDisplay(props.date)}`, { font: { bold: true, sz: 10 } }), "", "", "", "", "", sc(`Quotation No: ${props.quotationNo}`, { font: { bold: true, sz: 10 }, alignment: { horizontal: "right" } }), "", ""]);
  merges.push({ s: { r, c: 0 }, e: { r, c: 2 } }); merges.push({ s: { r, c: 6 }, e: { r, c: 8 } }); r++;
  data.push([]); r++;
  // Party
  data.push([sc(`M/S: ${props.partyName}`, { font: { bold: true, sz: 11 } }), "", "", "", "", "", "", "", ""]);
  merges.push({ s: { r, c: 0 }, e: { r, c: 8 } }); r++;
  if (props.partyAddress) { data.push([sc(props.partyAddress, boldStyle), "", "", "", "", "", "", "", ""]); merges.push({ s: { r, c: 0 }, e: { r, c: 8 } }); r++; }
  if (props.partyGST) { data.push([sc(`GST: ${props.partyGST}`, boldStyle), "", "", "", "", "", "", "", ""]); merges.push({ s: { r, c: 0 }, e: { r, c: 8 } }); r++; }
  data.push([]); r++;
  if (props.attention) { data.push([sc(`Kind Attention: ${props.attention}`, boldStyle), "", "", "", "", "", "", "", ""]); merges.push({ s: { r, c: 0 }, e: { r, c: 8 } }); r++; }
  data.push([sc(`SUBJECT: ${props.subject}`, { font: { bold: true, sz: 10 }, alignment: { wrapText: true } }), "", "", "", "", "", "", "", ""]);
  merges.push({ s: { r, c: 0 }, e: { r, c: 8 } }); r++;
  data.push([]); r++;

  // Table header
  const th = { font: { bold: true, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "1F4E79" } }, alignment: { horizontal: "center", wrapText: true }, border: { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } } };
  data.push([sc("SL NO", th), sc("ITEM CODE", th), sc("ITEM NAME", th), sc("ADDITIONAL DESCRIPTION", th), sc("SIZE", th), sc("HSN CODE", th), sc("QTY", th), sc("RATE", th), sc("AMOUNT", th)]); r++;

  // Items
  for (const row of props.rows) {
    if (row.rowType === "section") {
      const ss = { font: { bold: true }, fill: { fgColor: { rgb: "C6EFCE" } }, alignment: { horizontal: "center", wrapText: true }, border: { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } } };
      data.push([sc((row.desc || row.section || "").toUpperCase(), ss), sc("", ss), sc("", ss), sc("", ss), sc("", ss), sc("", ss), sc("", ss), sc("", ss), sc("", ss)]);
      merges.push({ s: { r, c: 0 }, e: { r, c: 8 } }); r++;
    } else {
      data.push([sc(row.slNo || "", cBorder), sc(row.itemCode || "", cBorder), sc(row.desc || "", lBorder), sc(row.additionalColumn || "", lBorder), sc(row.size || "", cBorder), sc(row.hsn || "", cBorder), sc(row.qty || "1", cBorder), sc(row.rate || "NQ", cBorder), sc(row.amt !== null ? row.amt : "NQ", cBorder)]); r++;
    }
  }

  // Totals
  const ts = { font: { bold: true }, fill: { fgColor: { rgb: "FFFFCC" } }, alignment: { horizontal: "center" }, border: { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } } };
  const pushT = (l: string, a: number, s: object) => { data.push(["", "", "", "", "", sc(l, s), sc("", s), sc("", s), sc(a, s)]); merges.push({ s: { r, c: 5 }, e: { r, c: 7 } }); r++; };
  pushT("TOTAL AMOUNT", safeNum(props.gross), ts);
  if (props.discounts.seasonal.enabled) pushT("SEASONAL DISCOUNT", safeNum(props.discounts.seasonal.amount), ts);
  if (props.discounts.special.enabled) pushT("SPECIAL DISCOUNT", safeNum(props.discounts.special.amount), ts);
  if (props.discounts.legacyAmount > 0) pushT("DISCOUNT", safeNum(props.discounts.legacyAmount), ts);
  if (hasDiscount) pushT("TOTAL AFTER DISCOUNT", safeNum(props.afterDiscount), ts);
  pushT("TRANSPORTATION CHARGES", safeNum(props.discounts.transportationAmount), ts);
  pushT("PACKING CHARGES", safeNum(props.discounts.packingAmount), ts);
  pushT("TAXABLE VALUE BEFORE GST", safeNum(props.afterDiscount + props.discounts.transportationAmount + props.discounts.packingAmount), ts);
  pushT("GST 18%", safeNum(props.gst), ts);
  const gs = { font: { bold: true, sz: 11 }, fill: { fgColor: { rgb: "FFD700" } }, alignment: { horizontal: "center" }, border: { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } } };
  pushT("GRAND TOTAL", safeNum(props.grandTotal), gs);
  data.push([]); r++;

  // Terms
  data.push(["", sc("Terms & Conditions:", { font: { bold: true, sz: 10, underline: true }, alignment: { wrapText: true } }), "", "", "", "", "", "", ""]); merges.push({ s: { r, c: 1 }, e: { r, c: 8 } }); r++;
  for (const t of TERMS) { data.push(["", sc(t, { font: { sz: 9 }, alignment: { wrapText: true } }), "", "", "", "", "", "", ""]); merges.push({ s: { r, c: 1 }, e: { r, c: 8 } }); r++; }
  data.push([]); r++;
  // Bank
  data.push(["", sc("BANK DETAILS", { font: { bold: true, sz: 10, underline: true } }), "", "", "", "", "", "", ""]); merges.push({ s: { r, c: 1 }, e: { r, c: 8 } }); r++;
  for (const l of ["ACCOUNT NAME- PRESTAIR SYSTEMS LLP","ACCOUNT NO - 4513086230","ACCOUNT TYPE- CURRENT ACCOUNT","IFSC CODE-KKBK0000154","BANK - KOTAK MAHINDRA BANK","BRANCH - SECTOR 51 NOIDA","","GST NO-09AATFP8342B1ZX"]) { data.push(["", sc(l, boldStyle), "", "", "", "", "", "", ""]); merges.push({ s: { r, c: 1 }, e: { r, c: 8 } }); r++; }
  data.push([]); r++; data.push([]); r++;
  data.push(["", sc("For Prestair Systems LLP", { font: { bold: true, sz: 11 } }), "", "", "", "", "", "", ""]); merges.push({ s: { r, c: 1 }, e: { r, c: 8 } }); r++;

  const ws = XLSX.utils.aoa_to_sheet(data);
  ws["!merges"] = merges;
  ws["!cols"] = [{ wch: 5 }, { wch: 10 }, { wch: 24 }, { wch: 48 }, { wch: 14 }, { wch: 8 }, { wch: 5 }, { wch: 10 }, { wch: 12 }];
  ws["!rows"] = [{ hpt: 22 }, { hpt: 22 }];
  XLSX.utils.book_append_sheet(wb, ws, "Quotation");

  const fileName = `Quotation_${(props.quotationNo || props.partyName).replace(/[/\\?%*:|"<>]/g, "-")}_${props.date}.xlsx`;

  // Inject logo into xlsx zip
  try {
    const logoRes = await fetch("/logos/prestair-inverted.png");
    if (!logoRes.ok) throw new Error("no logo");
    const logoBytes = new Uint8Array(await logoRes.arrayBuffer());
    const wbOut: ArrayBuffer = XLSX.write(wb, { type: "array", bookType: "xlsx" });
    const JSZip = (await import("jszip")).default;
    const zip = await JSZip.loadAsync(wbOut);

    zip.file("xl/media/image1.png", logoBytes);
    const emu = (px: number) => Math.round(px * 9525);
    zip.file("xl/drawings/drawing1.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><xdr:oneCellAnchor><xdr:from><xdr:col>0</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>0</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from><xdr:ext cx="${emu(180)}" cy="${emu(50)}"/><xdr:pic><xdr:nvPicPr><xdr:cNvPr id="2" name="Logo"/><xdr:cNvPicPr><a:picLocks noChangeAspect="1"/></xdr:cNvPicPr></xdr:nvPicPr><xdr:blipFill><a:blip r:embed="rId1" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"/><a:stretch><a:fillRect/></a:stretch></xdr:blipFill><xdr:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${emu(180)}" cy="${emu(50)}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></xdr:spPr></xdr:pic><xdr:clientData/></xdr:oneCellAnchor></xdr:wsDr>`);
    zip.file("xl/drawings/_rels/drawing1.xml.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/image1.png"/></Relationships>`);

    let wsRels = "";
    try { wsRels = await (zip.file("xl/worksheets/_rels/sheet1.xml.rels")?.async("string") ?? ""); } catch { /* */ }
    if (!wsRels || !wsRels.includes("Relationships")) wsRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing1.xml"/></Relationships>`;
    else wsRels = wsRels.replace("</Relationships>", `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing1.xml"/></Relationships>`);
    zip.file("xl/worksheets/_rels/sheet1.xml.rels", wsRels);

    let sheetXml = await (zip.file("xl/worksheets/sheet1.xml")?.async("string") ?? "");
    if (!sheetXml.includes("<drawing")) { sheetXml = sheetXml.replace("</worksheet>", `<drawing r:id="rId1"/></worksheet>`); zip.file("xl/worksheets/sheet1.xml", sheetXml); }

    let ct = await (zip.file("[Content_Types].xml")?.async("string") ?? "");
    if (!ct.includes('Extension="png"')) ct = ct.replace("</Types>", `<Default Extension="png" ContentType="image/png"/></Types>`);
    if (!ct.includes("drawing1.xml")) ct = ct.replace("</Types>", `<Override PartName="/xl/drawings/drawing1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/></Types>`);
    zip.file("[Content_Types].xml", ct);

    const blob = await zip.generateAsync({ type: "blob", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = fileName; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  } catch (e) {
    console.warn("Image injection failed:", e);
    XLSX.writeFile(wb, fileName);
  }
}
