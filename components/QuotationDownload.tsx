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
  doc.rect(0, 0, W, 30, "F");

  // Prestair Logo — stylized text (left)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text("Prestair", ML, 11);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(160, 190, 230);
  doc.text("Systems LLP", ML, 17);
  doc.setDrawColor(100, 140, 200);
  doc.line(ML, 18.5, ML + 32, 18.5);
  doc.setFontSize(6);
  doc.setTextColor(140, 170, 220);
  doc.text("Commercial Food Service Equipments  |  Since 1982", ML, 22);

  // ── Certification Badges (drawn as shapes — jsPDF can't render SVG images) ──
  const hbY = 5;
  doc.setFillColor(196, 30, 58);
  doc.circle(72, hbY + 5, 4.5, "F");
  doc.setFont("helvetica", "bold"); doc.setFontSize(4); doc.setTextColor(255,255,255);
  doc.text("GACB", 72, hbY + 6.5, { align: "center" });

  doc.setFillColor(255, 255, 255);
  doc.roundedRect(79, hbY + 1, 10, 8, 1, 1, "F");
  doc.setFontSize(7); doc.setTextColor(20,20,20);
  doc.text("CE", 84, hbY + 6.5, { align: "center" });

  doc.setFillColor(43, 93, 166);
  doc.circle(96, hbY + 5, 4.5, "F");
  doc.setFontSize(4.5); doc.setTextColor(255,255,255);
  doc.text("IAF", 96, hbY + 6.5, { align: "center" });

  doc.setFillColor(255, 255, 255);
  doc.roundedRect(103, hbY + 1, 14, 8, 1, 1, "F");
  doc.setFontSize(5); doc.setTextColor(26,79,139);
  doc.text("QCS", 110, hbY + 5, { align: "center" });
  doc.setFontSize(3); doc.setTextColor(46,139,87);
  doc.text("CERTIFIED", 110, hbY + 8, { align: "center" });

  doc.setFillColor(255, 255, 255);
  doc.roundedRect(120, hbY + 1, 14, 8, 1, 1, "F");
  doc.setFontSize(5); doc.setTextColor(26,79,139);
  doc.text("ISO", 127, hbY + 5, { align: "center" });
  doc.setFontSize(3);
  doc.text("9001:2015", 127, hbY + 8, { align: "center" });

  doc.setFillColor(255, 255, 255);
  doc.roundedRect(137, hbY + 1, 14, 8, 1, 1, "F");
  doc.setFontSize(5); doc.setTextColor(20,20,20);
  doc.text("UAF", 144, hbY + 6, { align: "center" });

  // Company info bottom line
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(180, 200, 240);
  doc.text("B-127 Phase-2, Noida, Uttar Pradesh 201305  |  GST: 09AATFP8342B1ZX", ML, 27);

  // Quotation No + Date (right)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(200, 220, 255);
  doc.text(`Quotation: ${props.quotationNo || "\u2014"}`, MR, 22, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text(`Date: ${props.date}`, MR, 27, { align: "right" });

  // ── Party info box ───────────────────────────────────────────────────────
  let y = 36;
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
    head: [["#", "Item Code", "Description", "Size", "HSN", "Qty", "Disc (₹)", "Rate (₹)", "Amount (₹)"]],
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
      fillColor:   [22, 40, 70],
      textColor:   [255, 255, 255],
      fontStyle:   "bold",
      fontSize:    7,
      cellPadding: { top: 3, bottom: 3, left: 2, right: 2 },
      valign:      "middle",
      halign:      "center",
    },
    bodyStyles: {
      fontSize:    7,
      cellPadding: { top: 2, bottom: 2, left: 2, right: 2 },
      textColor:   [30, 40, 60],
      valign:      "middle",
    },
    alternateRowStyles: { fillColor: [245, 248, 255] },
    tableWidth: CW,
    columnStyles: {
      0: { cellWidth: 7,   halign: "center",  fontStyle: "bold" },
      1: { cellWidth: 19,  halign: "center",  fontStyle: "bold" },
      2: { cellWidth: 68,  halign: "left"   },
      3: { cellWidth: 22,  halign: "center" },
      4: { cellWidth: 13,  halign: "center" },
      5: { cellWidth: 8,   halign: "center" },
      6: { cellWidth: 17,  halign: "right"  },
      7: { cellWidth: 17,  halign: "right"  },
      8: { cellWidth: 15,  halign: "right",  fontStyle: "bold" },
    },
    didDrawPage: (data) => {
      // Re-draw mini header on every page
      doc.setFillColor(22, 40, 70);
      doc.rect(0, 0, W, 7, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(6.5);
      doc.setTextColor(200, 220, 255);
      doc.text("PRESTAIR SYSTEMS LLP", ML, 5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(160, 190, 240);
      doc.text(`Quotation: ${props.quotationNo || "—"}  |  ${props.partyName}`, 105, 5, { align: "center" });
      doc.text(`Page ${data.pageNumber}`, MR, 5, { align: "right" });
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
  // Logos row above signature — load actual images from public folder
  ty += 4;
  if (ty + 30 > 270) { doc.addPage(); ty = 15; }

  const badgeRow = ty + 2;

  // Logo files with format (jsPDF supports PNG and JPEG)
  const logoConfigs = [
    { file: "gacb.png",  fmt: "PNG",  w: 12, h: 12 },
    { file: "ce.jpg",    fmt: "JPEG", w: 14, h: 9  },
    { file: "iaf.png",   fmt: "PNG",  w: 16, h: 11 },
    { file: "iso.png",   fmt: "PNG",  w: 12, h: 12 },
  ];

  let lx = ML;
  for (const logo of logoConfigs) {
    try {
      const imgUrl = `/logos/${logo.file}`;
      const response = await fetch(imgUrl);
      if (response.ok) {
        const blob = await response.blob();
        const dataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
        doc.addImage(dataUrl, logo.fmt, lx, badgeRow, logo.w, logo.h);
      }
    } catch {
      // skip if image not available
    }
    lx += logo.w + 4;
  }

  ty += 18;
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
