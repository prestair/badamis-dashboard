"use client";

import { useState } from "react";
import { SavedQuotation } from "@/context/QuotationContext";

type Props = { quotation: SavedQuotation; partyName: string; quotationNo: string; date: string; subject: string; rows: RowData[]; gross: number; discount: number; afterDiscount: number; gst: number; grandTotal: number; };

type RowData = { slNo: string; itemCode: string; desc: string; size: string; hsn: string; qty: string; discount: string; rate: string; amt: number | null; };

function fmt(n: number) { return n.toLocaleString("en-IN"); }

// ── EXCEL DOWNLOAD ─────────────────────────────────────────────────────────────
async function downloadExcel(props: Props) {
  const XLSX = await import("xlsx");

  const header = [
    ["PRESTAIR SYSTEMS LLP"],
    ["B-127 Phase-2, Noida, Uttar Pradesh 201305 | GST: 09AATFP8342B1ZX"],
    [],
    ["M/S:", props.partyName],
    ["Date:", props.date],
    ["Quotation No.:", props.quotationNo],
    ["Subject:", props.subject],
    [],
    ["SL NO", "ITEM CODE", "DESCRIPTION", "SIZE", "HSN CODE", "QTY", "DISCOUNT", "RATE (₹)", "AMOUNT (₹)"],
  ];

  const itemRows = props.rows.map((r) => [
    r.slNo,
    r.itemCode,
    r.desc,
    r.size,
    r.hsn,
    r.qty,
    r.discount,
    r.rate,
    r.amt !== null ? r.amt : "NQ",
  ]);

  const totals = [
    [],
    ["", "", "", "", "", "", "", "TOTAL (GROSS)", fmt(props.gross)],
    ["", "", "", "", "", "", "", "LESS – DISCOUNT", fmt(props.discount)],
    ["", "", "", "", "", "", "", "TOTAL AFTER DISCOUNT", fmt(props.afterDiscount)],
    ["", "", "", "", "", "", "", "GST @ 18%", fmt(props.gst)],
    ["", "", "", "", "", "", "", "GRAND TOTAL", fmt(props.grandTotal)],
    [],
    ["TRANSPORTATION CHARGES AS ACTUAL"],
    [],
    ["Terms & Conditions:"],
    ["1. Rates valid for 10 days."],
    ["2. Delivery: 8 weeks."],
    ["3. Payment: 60% advance + 40% before delivery."],
    ["4. Warranty: 12 months from invoice date."],
    [],
    ["Bank Details:"],
    ["Account Name: PRESTAIR SYSTEMS LLP"],
    ["Account No: 4513086230"],
    ["IFSC: KKBK0000154 | Bank: Kotak Mahindra Bank | Branch: Sector 51 Noida"],
    ["GST: 09AATFP8342B1ZX"],
  ];

  const allData = [...header, ...itemRows, ...totals];
  const ws = XLSX.utils.aoa_to_sheet(allData);

  // column widths
  ws["!cols"] = [
    { wch: 8 }, { wch: 12 }, { wch: 45 }, { wch: 18 },
    { wch: 10 }, { wch: 6 }, { wch: 12 }, { wch: 14 }, { wch: 16 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Quotation");
  const filename = `Quotation_${props.quotationNo || props.partyName}_${props.date}.xlsx`
    .replace(/[/\\?%*:|"<>]/g, "-");
  XLSX.writeFile(wb, filename);
}

// ── PDF DOWNLOAD ───────────────────────────────────────────────────────────────
async function downloadPDF(props: Props) {
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

  // Header
  doc.setFillColor(30, 58, 95);
  doc.rect(0, 0, 297, 20, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("PRESTAIR SYSTEMS LLP", 148, 8, { align: "center" });
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("B-127 Phase-2, Noida, Uttar Pradesh 201305  |  GST: 09AATFP8342B1ZX", 148, 14, { align: "center" });

  // Party info
  doc.setTextColor(30, 58, 95);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  let y = 26;
  doc.text(`M/S: ${props.partyName}`, 10, y);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(60, 60, 60);
  doc.text(`Date: ${props.date}`, 180, y);
  doc.text(`Quotation No: ${props.quotationNo}`, 230, y);
  y += 6;
  doc.setFontSize(8);
  doc.text(`Subject: ${props.subject}`, 10, y, { maxWidth: 270 });
  y += 8;

  // Items table
  autoTable(doc, {
    startY: y,
    head: [["SL NO", "ITEM CODE", "DESCRIPTION", "SIZE", "HSN", "QTY", "DISCOUNT", "RATE (₹)", "AMOUNT (₹)"]],
    body: props.rows.map((r) => [
      r.slNo, r.itemCode, r.desc, r.size, r.hsn, r.qty,
      r.discount || "0", r.rate || "NQ",
      r.amt !== null ? fmt(r.amt) : "NQ",
    ]),
    styles: { fontSize: 7, cellPadding: 2 },
    headStyles: { fillColor: [51, 65, 85], textColor: 255, fontStyle: "bold", fontSize: 7 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 14 },
      1: { cellWidth: 20 },
      2: { cellWidth: 75 },
      3: { cellWidth: 28 },
      4: { cellWidth: 16 },
      5: { cellWidth: 10 },
      6: { cellWidth: 20 },
      7: { cellWidth: 24 },
      8: { cellWidth: 26 },
    },
    didDrawPage: (data) => {
      // page number
      doc.setFontSize(7);
      doc.setTextColor(150);
      doc.text(`Page ${data.pageNumber}`, 285, 205, { align: "right" });
    },
  });

  // Totals
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const finalY = (doc as any).lastAutoTable.finalY + 4;
  const totalsData = [
    ["TOTAL (GROSS)",        `₹ ${fmt(props.gross)}`,        "#fefce8", "#713f12"],
    ["LESS – DISCOUNT",      `₹ ${fmt(props.discount)}`,     "#fff7ed", "#9a3412"],
    ["TOTAL AFTER DISCOUNT", `₹ ${fmt(props.afterDiscount)}`,  "#fff7ed", "#9a3412"],
    ["GST @ 18%",            `₹ ${fmt(props.gst)}`,          "#fef2f2", "#991b1b"],
    ["GRAND TOTAL",          `₹ ${fmt(props.grandTotal)}`,   "#166534", "#ffffff"],
  ];

  let ty = finalY;
  totalsData.forEach(([label, val, bg, fg]) => {
    const [r, g, b] = bg === "#166534" ? [22, 101, 52] : bg === "#fefce8" ? [254, 252, 232] : bg === "#fff7ed" ? [255, 247, 237] : [254, 242, 242];
    doc.setFillColor(r, g, b);
    doc.rect(180, ty - 4, 107, 7, "F");
    doc.setFontSize(8);
    doc.setFont("helvetica", fg === "#ffffff" ? "bold" : "normal");
    const [fr, fg2, fb] = fg === "#ffffff" ? [255, 255, 255] : fg === "#713f12" ? [113, 63, 18] : fg === "#9a3412" ? [154, 52, 18] : [153, 27, 27];
    doc.setTextColor(fr, fg2, fb);
    doc.text(label, 185, ty);
    doc.text(val, 284, ty, { align: "right" });
    ty += 7;
  });

  // Footer
  doc.setFontSize(7);
  doc.setTextColor(100);
  doc.text("TRANSPORTATION CHARGES AS ACTUAL  |  Payment: 60% advance + 40% before delivery  |  Warranty: 12 months", 148, ty + 4, { align: "center" });
  doc.setFontSize(7);
  doc.text("Bank: Prestair Systems LLP  |  A/C: 4513086230  |  IFSC: KKBK0000154  |  Kotak Mahindra Bank, Sector 51 Noida", 148, ty + 9, { align: "center" });

  // ── Terms & Conditions ──────────────────────────────────────────────────────
  const termsY = ty + 18;
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 58, 95);
  doc.text("Terms & Conditions:", 10, termsY);

  const terms = [
    "1. Rates: - valid for 10 days.",
    "2. Delivery Period: - 8 WEEKS. (However, under unavoidable circumstances, like natural calamities, war strikes etc. We shall not be liable for any cancellation or delay in meeting delivery date.)",
    "3. Taxes: - G.S.T & Other taxes will be charged extra as applicable by Central Govt./State Govt. time to time. Transportation/Forwarding/Loading/Unloading: Extra and to be paid by client.",
    "4. Transportation/Forwarding/Loading/Unloading: - Extra on actual paid by client. Client may also arrange their own vehicle for pickup.",
    "5. Way bill/Road Permit if required, to be arranged by the Client.",
    "6. Packing: (a) Shrink roll/thermocol packing FOC  (b) Wooden crate/cargo box packing charge extra on actual if required.",
    "7. Site work: - All civil/masonry/wooden/electrical work done by client at his own cost. Rates: ex-works, Delhi.",
    "8. Payment Terms: (a) 60% advance along with confirm purchase order and balance 40% payment before delivery from our warehouse.  (b) 100% advance for Imported Equipment.",
    "9. Jurisdiction Noida (U.P)",
    "10. The order is/are accepted, subject no to strikes, lockout, accidents, fire, riots, civil commotion & other causes beyond our control.",
    "11. The lodging and boarding of the mechanic team will be arranged by the client at their own cost outside Delhi.",
    "12. Once the order is placed cannot be cancelled.",
  ];

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(60, 60, 60);
  let tY = termsY + 5;
  terms.forEach((line) => {
    const split = doc.splitTextToSize(line, 275);
    // Add new page if needed
    if (tY + split.length * 4 > 200) {
      doc.addPage();
      tY = 15;
    }
    doc.text(split, 10, tY);
    tY += split.length * 4 + 1;
  });

  // Bank details at end
  tY += 3;
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 58, 95);
  doc.text("Bank Details:", 10, tY);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(60, 60, 60);
  doc.text("Account Name: Prestair Systems LLP  |  A/C No: 4513086230  |  IFSC: KKBK0000154  |  Kotak Mahindra Bank, Sector 51 Noida  |  GST: 09AATFP8342B1ZX", 10, tY + 5, { maxWidth: 275 });

  const filename = `Quotation_${props.quotationNo || props.partyName}_${props.date}.pdf`
    .replace(/[/\\?%*:|"<>]/g, "-");
  doc.save(filename);
}

// ── Component ──────────────────────────────────────────────────────────────────
export default function QuotationDownload(props: Props) {
  const [pdfLoading,   setPdfLoading]   = useState(false);
  const [excelLoading, setExcelLoading] = useState(false);

  async function handlePDF() {
    setPdfLoading(true);
    try { await downloadPDF(props); } finally { setPdfLoading(false); }
  }

  async function handleExcel() {
    setExcelLoading(true);
    try { await downloadExcel(props); } finally { setExcelLoading(false); }
  }

  return (
    <div className="flex items-center gap-2">
      {/* PDF */}
      <button
        onClick={handlePDF}
        disabled={pdfLoading}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-red-600 hover:bg-red-700 active:scale-95 transition-all disabled:opacity-60 shadow"
        title="Download PDF"
      >
        {pdfLoading ? (
          <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
          </svg>
        ) : "📄"}
        PDF
      </button>

      {/* Excel */}
      <button
        onClick={handleExcel}
        disabled={excelLoading}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-green-700 hover:bg-green-800 active:scale-95 transition-all disabled:opacity-60 shadow"
        title="Download Excel"
      >
        {excelLoading ? (
          <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
          </svg>
        ) : "📊"}
        Excel
      </button>
    </div>
  );
}
