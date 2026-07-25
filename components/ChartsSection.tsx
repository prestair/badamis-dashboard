"use client";

import dynamic from "next/dynamic";

function ChartSkeleton() {
  return (
    <div className="bg-white rounded-xl shadow-sm p-5 animate-pulse">
      <div className="h-4 w-48 bg-slate-200 rounded mb-4" />
      <div className="h-[260px] bg-slate-100 rounded-lg" />
    </div>
  );
}

const SectionBarChart = dynamic(() => import("@/components/SectionBarChart"), {
  ssr: false,
  loading: () => <ChartSkeleton />,
});

const Top10Chart = dynamic(() => import("@/components/Top10Chart"), {
  ssr: false,
  loading: () => <ChartSkeleton />,
});

const PaymentChart = dynamic(() => import("@/components/PaymentChart"), {
  ssr: false,
  loading: () => <ChartSkeleton />,
});

const SectionCountChart = dynamic(() => import("@/components/SectionCountChart"), {
  ssr: false,
  loading: () => <ChartSkeleton />,
});

export default function ChartsSection() {
  return (
    <>
      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <SectionBarChart />
        <Top10Chart />
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <PaymentChart />
        <SectionCountChart />
      </div>
    </>
  );
}
