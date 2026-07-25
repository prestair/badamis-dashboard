import { QUOTATION_META } from "@/lib/data";
import KpiCards from "@/components/KpiCards";
import ItemTable from "@/components/ItemTable";
import ChartsSection from "@/components/ChartsSection";
import HeaderActions from "@/components/HeaderActions";
import UserBar from "@/components/UserBar";

const TERMS = [
  { icon: "✅", label: "Rate validity", value: "10 days" },
  { icon: "🚚", label: "Delivery", value: "8 weeks" },
  { icon: "💳", label: "Payment", value: "60% advance + 40% before delivery" },
  { icon: "🔒", label: "Warranty", value: "12 months from invoice date" },
  { icon: "📦", label: "Packing", value: "Shrink / thermocol FOC; wooden crate extra" },
  { icon: "⚡", label: "Site work", value: "Electrical / gas / civil by client" },
  { icon: "🌍", label: "Jurisdiction", value: "Noida, UP" },
  { icon: "🚫", label: "Cancellation", value: "Order once placed cannot be cancelled" },
];

export default function DashboardPage() {
  return (
    <div className="min-h-screen flex flex-col">

      {/* ── NEW HEADER DESIGN ── */}
      <header className="bg-gradient-to-r from-slate-900 to-blue-700 text-white shadow-lg">
        <div className="max-w-screen-2xl mx-auto px-6">

          {/* Row 1: Company name (top-left) + Center title + User (top-right) */}
          <div className="flex items-center justify-between py-4 border-b border-white/10">
            {/* Left: Company name */}
            <div className="flex-1">
              <p className="text-sm font-semibold tracking-wide">Prestair Systems LLP</p>
              <p className="text-xs text-blue-200 mt-0.5">GST: {QUOTATION_META.vendorGST}</p>
            </div>

            {/* Center: Main title */}
            <h1 className="text-2xl font-bold tracking-wide">
              Quotation Dashboard Report
            </h1>

            {/* Right: User & Logout */}
            <div className="flex-1 flex justify-end">
              <UserBar />
            </div>
          </div>

          {/* Rows 2 & 3: Action buttons + number row (client — needs context) */}
          <HeaderActions />

        </div>
      </header>

      <main className="flex-1 max-w-screen-2xl mx-auto w-full px-4 sm:px-6 py-6 space-y-6">

        {/* ── KPI CARDS ── */}
        <KpiCards />

        {/* ── CHARTS ── */}
        <ChartsSection />

        {/* ── ITEM TABLE ── */}
        <ItemTable />

        {/* ── TERMS ── */}
        <div className="bg-white rounded-xl shadow-sm p-5">
          <h2 className="text-sm font-bold text-slate-700 mb-4">
            Key Terms &amp; Conditions
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {TERMS.map((t) => (
              <div
                key={t.label}
                className="flex gap-2 items-start text-sm text-slate-600 bg-slate-50 rounded-lg px-3 py-2"
              >
                <span className="text-base leading-snug">{t.icon}</span>
                <div>
                  <span className="font-semibold text-slate-700">{t.label}: </span>
                  {t.value}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── BANK DETAILS ── */}
        <div className="bg-white rounded-xl shadow-sm p-5">
          <h2 className="text-sm font-bold text-slate-700 mb-3">Bank Details</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs text-slate-600">
            {(
              [
                ["Account Name", "Prestair Systems LLP"],
                ["Account No", "4513086230"],
                ["Account Type", "Current Account"],
                ["IFSC Code", "KKBK0000154"],
                ["Bank", "Kotak Mahindra Bank"],
                ["Branch", "Sector 51, Noida"],
              ] as const
            ).map(([k, v]) => (
              <div key={k} className="bg-slate-50 rounded-lg px-3 py-2">
                <p className="text-slate-400 text-[10px] uppercase tracking-wide mb-0.5">{k}</p>
                <p className="font-semibold text-slate-800">{v}</p>
              </div>
            ))}
          </div>
        </div>

      </main>

      {/* ── FOOTER ── */}
      <footer className="text-center text-xs text-slate-400 py-4 border-t border-slate-200 bg-white">
        Quotation {QUOTATION_META.quotationNo} &nbsp;·&nbsp; {QUOTATION_META.vendor}
        &nbsp;·&nbsp; GST: {QUOTATION_META.vendorGST}
      </footer>

    </div>
  );
}
