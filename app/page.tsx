import { QUOTATION_META } from "@/lib/data";
import KpiCards from "@/components/KpiCards";
import ChartsSection from "@/components/ChartsSection";
import HeaderActions from "@/components/HeaderActions";
import UserBar from "@/components/UserBar";
import HamburgerMenu from "@/components/HamburgerMenu";
import DashboardToolbar from "@/components/DashboardToolbar";
import PrestairLogo, { PRESTAIR_ADDRESS } from "@/components/PrestairLogo";

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

      {/* ── HEADER ── */}
      <header className="bg-gradient-to-r from-slate-900 to-blue-700 text-white shadow-lg">
        <div className="max-w-screen-2xl mx-auto px-6">

          {/* Row 1: Company logo + report title + company/user details */}
          <div className="grid grid-cols-1 items-center gap-3 border-b border-white/10 py-4 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">

            {/* Left: exact shared Prestair logo + certification badges */}
            <div className="flex min-w-0 flex-wrap items-center justify-center gap-3 lg:justify-start">
              <div className="relative">
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute -inset-x-5 -inset-y-2 rounded-full bg-[radial-gradient(ellipse_at_left,rgba(147,197,253,0.3),rgba(59,130,246,0.1)_52%,transparent_74%)] blur-md"
                />
                <PrestairLogo className="relative h-11 sm:h-12 xl:h-14" />
              </div>

              {/* Certification badges stay visible when the header has enough room. */}
              <div className="hidden items-center gap-1.5 xl:flex">
                <img src="/logos/gacb.svg" alt="GACB" className="h-6 w-6 rounded-full bg-white p-0.5" title="GACB" />
                <img src="/logos/ce.svg" alt="CE" className="h-5 w-8 rounded bg-white px-1" title="CE Mark" />
                <img src="/logos/iaf.svg" alt="IAF" className="h-6 w-9 rounded" title="IAF" />
                <img src="/logos/qcs.svg" alt="QCS" className="h-6 w-9 rounded bg-white p-0.5" title="QCS" />
                <img src="/logos/iso.svg" alt="ISO" className="h-6 w-6 rounded bg-white p-0.5" title="ISO 9001:2015" />
                <img src="/logos/uaf.svg" alt="UAF" className="h-5 w-10 rounded bg-white" title="UAF" />
              </div>
            </div>

            {/* Center: Main title */}
            <h1 className="order-first whitespace-nowrap text-center text-base font-bold tracking-wide sm:text-lg lg:order-none">
              Quotation Dashboard Report
            </h1>

            {/* Right: full address, GST, user controls and menu */}
            <div className="flex min-w-0 flex-col items-center gap-2 lg:items-end">
              <div className="flex items-start gap-3">
                <div className="max-w-sm text-center lg:text-right">
                  <p className="text-xs text-blue-200">GST: {QUOTATION_META.vendorGST}</p>
                  <p className="text-[10px] leading-relaxed text-blue-300">{PRESTAIR_ADDRESS}</p>
                </div>
                <HamburgerMenu />
              </div>
              <UserBar />
            </div>
          </div>

          {/* Rows 2 & 3: Action buttons + number row (client — needs context) */}
          <HeaderActions />
          <DashboardToolbar />

        </div>
      </header>

      <main className="flex-1 max-w-screen-2xl mx-auto w-full px-4 sm:px-6 py-6 space-y-6">

        {/* ── KPI CARDS ── */}
        <div className="animate-fade-in">
          <KpiCards />
        </div>

        {/* ── CHARTS ── */}
        <div className="animate-slide-up" style={{animationDelay:"0.1s"}}>
          <ChartsSection />
        </div>

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
