"use client";

import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip } from "recharts";
import { useDashboard } from "@/context/DashboardContext";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload?.length) {
    const d = payload[0].payload;
    return (
      <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 shadow text-sm">
        <p className="font-semibold text-slate-700">{d.section}</p>
        <p className="text-slate-500">{d.count} items</p>
      </div>
    );
  }
  return null;
};

export default function SectionCountChart() {
  const { sectionTotals } = useDashboard();

  const data = sectionTotals.map((s) => ({
    subject: s.section,
    count: s.count,
    section: s.section,
    color: s.color,
  }));

  return (
    <div className="bg-white rounded-xl shadow-sm p-5">
      <h2 className="text-sm font-bold text-slate-700 mb-1">Item Count per Section</h2>
      <p className="text-xs text-slate-400 mb-3">Total items across all sections</p>
      <ResponsiveContainer width="100%" height={230}>
        <RadarChart data={data} margin={{ top: 8, right: 24, left: 24, bottom: 8 }}>
          <PolarGrid stroke="#e2e8f0" />
          <PolarAngleAxis dataKey="subject" tick={{ fontSize: 9, fill: "#475569" }} />
          <Radar
            name="Items"
            dataKey="count"
            stroke="#2563eb"
            fill="#2563eb"
            fillOpacity={0.25}
            strokeWidth={2}
          />
          <Tooltip content={<CustomTooltip />} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
