"use client";

import { useState } from "react";
import { SavedQuotation } from "@/context/QuotationContext";

type Props = {
  quotation:     SavedQuotation;
  partyName:     string;
  quotationNo:   string;
  date:          string;
  subject:       string;
  rows:          RowData[];
  gross:         number;
  discount:      number;
  afterDiscount: number;
  gst:           number;
  grandTotal:    number;
};

type RowData = {
  slNo: string; itemCode: string; desc: string; size: string;
  hsn: string; qty: string; discount: string; rate: string; amt: number | null;
};

const fmtNum = (n: number) => n.toLocaleString("en-IN");

const TERMS = [
  "1. Rates: - valid for 10 days.",
  "2. Delivery Period: - 8 WEEKS. (However, under unavoidable circumstances like natural calamities, war strikes etc., we shall not be liable for any cancellation or delay in meeting delivery date.)",
  "3. Taxes: - G.S.T & other taxes will be charged extra as applicable by Central Govt./State Govt. from time to time. Transportation/Forwarding/Loading/Unloading: Extra and to be paid by client.",
  "4. Transportation/Forwarding/Loading/Unloading: - Extra on actual, paid by client. Client may also arrange their own vehicle for pickup.",
  "5. Way bill/Road Permit if required, to be arranged by the Client.",
  "6. Packing: (a) Shrink roll/thermocol packing FOC.  (b) Wooden crate/cargo box packing charged extra on actual if required.",
  "7. Site work: - All civil/masonry/wooden/electrical work to be done by client at their own cost. Rates: ex-works, Delhi.",
  "8. Payment Terms: (a) 60% advance along with confirmed purchase order and balance 40% before delivery from our warehouse.  (b) 100% advance for Imported Equipment.",
  "9. Jurisdiction: Noida (U.P)",
  "10. The order is/are accepted subject to strikes, lockouts, accidents, fire, riots, civil commotion & other causes beyond our control.",
  "11. The lodging and boarding of the mechanic team will be arranged by the client at their own cost outside Delhi.",
  "12. Once the order is placed, it cannot be cancelled.",
];

// ── EXCEL ─────────────────────────────────────────────────────────────────────
async function downloadExcel(props: Props) {
  const XLSX = await import("xlsx");
  const wb   = XLSX.utils.book_new();

  const data: unknown[][] = [
    ["PRESTAIR SYSTEMS LLP"],
    ["B-127 Phase-2, Noida, Uttar Pradesh 201305  |  GST: 09AATFP8342B1ZX  |  Since 1982"],
    [],
    ["M/S:", props.partyName],
    ["Date:", props.date],
    ["Quotation No.:", props.quotationNo],
    ["Subject:", props.subject],
    [],
    ["SL NO","ITEM CODE","DESCRIPTION","SIZE","HSN CODE","QTY","DISCOUNT (₹)","RATE (₹)","AMOUNT (₹)"],
    ...props.rows.map((r) => [r.slNo, r.itemCode, r.desc, r.size, r.hsn, r.qty, r.discount, r.rate, r.amt ?? "NQ"]),
    [],
    ["","","","","","","","TOTAL (GROSS)",           props.gross],
    ["","","","","","","","LESS – DISCOUNT",          props.discount],
    ["","","","","","","","TOTAL AFTER DISCOUNT",     props.afterDiscount],
    ["","","","","","","","GST @ 18%",                props.gst],
    ["","","","","","","","GRAND TOTAL",              props.grandTotal],
    [],
    ["TRANSPORTATION CHARGES AS ACTUAL"],
    [],
    ["TERMS & CONDITIONS:"],
    ...TERMS.map((t) => [t]),
    [],
    ["BANK DETAILS:"],
    ["Account Name: PRESTAIR SYSTEMS LLP"],
    ["Account No: 4513086230  |  IFSC: KKBK0000154  |  Bank: Kotak Mahindra Bank, Sector 51 Noida"],
    ["GST: 09AATFP8342B1ZX"],
  ];

  const ws = XLSX.utils.aoa_to_sheet(data);
  ws["!cols"] = [
    { wch: 6 }, { wch: 12 }, { wch: 46 }, { wch: 18 },
    { wch: 10 }, { wch: 5 }, { wch: 13 }, { wch: 14 }, { wch: 16 },
  ];
  XLSX.utils.book_append_sheet(wb, ws, "Quotation");
  XLSX.writeFile(wb, `Quotation_${(props.quotationNo || props.partyName).replace(/[/\\?%*:|"<>]/g,"-")}_${props.date}.xlsx`);
}

// ── PDF ───────────────────────────────────────────────────────────────────────
async function downloadPDF(props: Props) {
  const { default: jsPDF }     = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  // A4 Portrait for a clean look
  const doc  = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W    = 210;   // page width
  const ML   = 12;    // left margin
  const MR   = 198;   // right edge
  const CW   = MR - ML; // content width

  // ── Page header (full-width dark band) ───────────────────────────────────
  doc.setFillColor(22, 40, 70);
  doc.rect(0, 0, W, 24, "F");

  // Logo text
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(255, 255, 255);
  doc.text("PRESTAIR SYSTEMS LLP", ML, 10);

  // Tagline
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(180, 200, 240);
  doc.text("Commercial Food Service Equipments  |  Since 1982  |  ISO 9001:2015 Certified", ML, 15);
  doc.text("B-127 Phase-2, Noida, Uttar Pradesh 201305  |  GST: 09AATFP8342B1ZX", ML, 19.5);

  // Quotation No + Date (top-right)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(200, 220, 255);
  doc.text(`Quotation: ${props.quotationNo || "—"}`, MR, 12, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.text(`Date: ${props.date}`, MR, 18, { align: "right" });

  // ── Party info box ───────────────────────────────────────────────────────
  let y = 30;
  doc.setFillColor(246, 249, 255);
  doc.roundedRect(ML, y, CW, 22, 2, 2, "F");
  doc.setDrawColor(200, 210, 230);
  doc.roundedRect(ML, y, CW, 22, 2, 2, "S");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(30, 58, 95);
  doc.text("TO:", ML + 3, y + 5);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(props.partyName.toUpperCase(), ML + 12, y + 5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(70, 80, 100);
  if (props.subject) {
    const subjectLines = doc.splitTextToSize(`Sub: ${props.subject}`, CW - 10);
    doc.text(subjectLines, ML + 3, y + 11);
  }

  y += 27;

  // ── Items table ───────────────────────────────────────────────────────────
  autoTable(doc, {
    startY: y,
    margin: { left: ML, right: ML },
    head: [["#", "Item Code", "Description", "Size", "HSN", "Qty", "Disc(₹)", "Rate(₹)", "Amount(₹)"]],
    body: props.rows.map((r, i) => [
      String(i + 1),
      r.itemCode || "—",
      r.desc     || "—",
      r.size     || "—",
      r.hsn      || "—",
      r.qty      || "1",
      r.discount || "0",
      r.rate     || "NQ",
      r.amt !== null ? fmtNum(r.amt) : "NQ",
    ]),
    headStyles: {
      fillColor:  [22, 40, 70],
      textColor:  [255, 255, 255],
      fontStyle:  "bold",
      fontSize:   7,
      cellPadding: 2.5,
    },
    bodyStyles: {
      fontSize:    7,
      cellPadding: 2,
      textColor:   [30, 40, 60],
    },
    alternateRowStyles: { fillColor: [245, 248, 255] },
    columnStyles: {
      0: { cellWidth: 8,  halign: "center" },
      1: { cellWidth: 18, halign: "center", fontStyle: "bold" },
      2: { cellWidth: 65 },
      3: { cellWidth: 22, halign: "center" },
      4: { cellWidth: 14, halign: "center" },
      5: { cellWidth: 8,  halign: "center" },
      6: { cellWidth: 16, halign: "right" },
      7: { cellWidth: 18, halign: "right" },
      8: { cellWidth: 20, halign: "right", fontStyle: "bold" },
    },
    didDrawPage: (data) => {
      // Re-draw header on every page
      doc.setFillColor(22, 40, 70);
      doc.rect(0, 0, W, 6, "F");
      doc.setFontSize(6);
      doc.setTextColor(180, 200, 240);
      doc.text("PRESTAIR SYSTEMS LLP  |  Quotation Dashboard", ML, 4.5);
      doc.text(`Page ${data.pageNumber}`, MR, 4.5, { align: "right" });
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const afterTable = (doc as any).lastAutoTable.finalY + 5;

  // ── Totals section ────────────────────────────────────────────────────────
  // Check if enough space; if not, add page
  const totalsH = 40;
  let ty = afterTable;
  if (ty + totalsH > 270) {
    doc.addPage();
    ty = 15;
  }

  // Totals table — right-aligned, clean two-column layout
  const totalsLeft  = 120;
  const totalsRight = MR;
  const totalsWidth = totalsRight - totalsLeft;
  const rowH = 6.5;

  const totalsRows: [string, number, [number,number,number], [number,number,number], boolean][] = [
    ["TOTAL (GROSS)",       props.gross,        [254,252,232], [92, 60, 10],   false],
    ["LESS – DISCOUNT",     props.discount,     [255,247,237], [154,52,18],    false],
    ["TOTAL AFTER DISCOUNT",props.afterDiscount,[255,247,237], [154,52,18],    true ],
    ["GST @ 18%",           props.gst,          [254,242,242], [153,27,27],    false],
    ["GRAND TOTAL",         props.grandTotal,   [22, 101,52],  [255,255,255],  true ],
  ];

  totalsRows.forEach(([label, val, bg, fg, bold]) => {
    doc.setFillColor(...bg);
    doc.rect(totalsLeft, ty - rowH + 1.5, totalsWidth, rowH, "F");
    doc.setDrawColor(200, 210, 220);
    doc.rect(totalsLeft, ty - rowH + 1.5, totalsWidth, rowH, "S");
    doc.setTextColor(...fg);
    doc.setFontSize(bold ? 8.5 : 7.5);
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.text(label, totalsLeft + 3, ty);
    doc.text(`Rs. ${fmtNum(val)}`, totalsRight - 3, ty, { align: "right" });
    ty += rowH;
  });

  ty += 4;
  doc.setFont("helvetica", "italic");
  doc.setFontSize(7);
  doc.setTextColor(120, 120, 120);
  doc.text("* Transportation charges as actual.", ML, ty);
  doc.text("* All prices are in Indian Rupees (INR).", ML, ty + 4);

  // ── Terms & Conditions ────────────────────────────────────────────────────
  ty += 12;
  if (ty + 8 > 270) { doc.addPage(); ty = 15; }

  // Section header
  doc.setFillColor(22, 40, 70);
  doc.rect(ML, ty - 3, CW, 7, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text("TERMS & CONDITIONS", ML + 3, ty + 1.5);
  ty += 9;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.8);
  doc.setTextColor(40, 50, 70);

  TERMS.forEach((line) => {
    const split = doc.splitTextToSize(line, CW - 2);
    if (ty + split.length * 4 > 280) {
      doc.addPage();
      ty = 15;
    }
    doc.text(split, ML, ty);
    ty += split.length * 4.2 + 0.8;
  });

  // ── Bank Details ──────────────────────────────────────────────────────────
  ty += 4;
  if (ty + 18 > 280) { doc.addPage(); ty = 15; }

  doc.setFillColor(240, 245, 255);
  doc.roundedRect(ML, ty - 3, CW, 16, 2, 2, "F");
  doc.setDrawColor(190, 210, 240);
  doc.roundedRect(ML, ty - 3, CW, 16, 2, 2, "S");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(22, 40, 70);
  doc.text("BANK DETAILS", ML + 3, ty + 2);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(40, 50, 70);
  doc.text("Account Name: Prestair Systems LLP  |  Account No: 4513086230", ML + 3, ty + 7);
  doc.text("IFSC: KKBK0000154  |  Bank: Kotak Mahindra Bank  |  Branch: Sector 51, Noida", ML + 3, ty + 11);

  // ── Footer on last page ───────────────────────────────────────────────────
  ty += 22;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(22, 40, 70);
  doc.text("For Prestair Systems LLP", MR, ty, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(100, 110, 130);
  doc.text("Authorised Signatory", MR, ty + 6, { align: "right" });

  // Page footer line on every page
  const pageCount = (doc as unknown as { internal: { getNumberOfPages: () => number } }).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setDrawColor(200, 210, 230);
    doc.line(ML, 288, MR, 288);
    doc.setFontSize(6);
    doc.setTextColor(150, 160, 180);
    doc.text("Prestair Systems LLP  |  B-127 Phase-2, Noida, UP 201305  |  GST: 09AATFP8342B1ZX", ML, 292);
    doc.text(`Page ${i} of ${pageCount}`, MR, 292, { align: "right" });
  }

  doc.save(`Quotation_${(props.quotationNo || props.partyName).replace(/[/\\?%*:|"<>]/g,"-")}_${props.date}.pdf`);
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function QuotationDownload(props: Props) {
  const [pdfLoading,   setPdfLoading]   = useState(false);
  const [excelLoading, setExcelLoading] = useState(false);

  return (
    <div className="flex items-center gap-2">
      <button onClick={async () => { setPdfLoading(true); try { await downloadPDF(props); } finally { setPdfLoading(false); } }}
        disabled={pdfLoading}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-red-600 hover:bg-red-700 active:scale-95 transition-all disabled:opacity-60 shadow"
        title="Download PDF">
        {pdfLoading
          ? <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
          : "📄"} PDF
      </button>
      <button onClick={async () => { setExcelLoading(true); try { await downloadExcel(props); } finally { setExcelLoading(false); } }}
        disabled={excelLoading}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-green-700 hover:bg-green-800 active:scale-95 transition-all disabled:opacity-60 shadow"
        title="Download Excel">
        {excelLoading
          ? <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
          : "📊"} Excel
      </button>
    </div>
  );
}
