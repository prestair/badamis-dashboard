"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { useDashboard } from "@/context/DashboardContext";

function formatLakh(v: number) {
  if (v >= 100000) return `₹${(v / 100000).toFixed(1)}L`;
  return `₹${(v / 1000).toFixed(0)}K`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload?.length) {
    const d = payload[0].payload;
    return (
      <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 shadow text-sm">
        <p className="font-semibold text-slate-800">{d.section}</p>
        <p className="text-slate-600">₹{d.amt.toLocaleString("en-IN")}</p>
      </div>
    );
  }
  return null;
};

export default function SectionBarChart() {
  // read live from context — recalculated whenever items change
  const { sectionTotals } = useDashboard();

  return (
    <div className="bg-white rounded-xl shadow-sm p-5">
      <h2 className="text-sm font-bold text-slate-700 mb-4">
        Section-wise Amount Breakdown
      </h2>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={sectionTotals} margin={{ top: 4, right: 8, left: 8, bottom: 60 }}>
          <XAxis
            dataKey="section"
            tick={{ fontSize: 10, fill: "#475569" }}
            angle={-35}
            textAnchor="end"
            interval={0}
          />
          <YAxis tickFormatter={formatLakh} tick={{ fontSize: 10, fill: "#475569" }} width={52} />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="amt" radius={[5, 5, 0, 0]}>
            {sectionTotals.map((entry) => (
              <Cell key={entry.section} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
