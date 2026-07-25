"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { useDashboard } from "@/context/DashboardContext";
import { SECTION_COLORS, fmtINR } from "@/lib/data";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload?.length) {
    const d = payload[0].payload;
    return (
      <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 shadow text-sm max-w-xs">
        <p className="font-semibold text-slate-800">{d.id}</p>
        <p className="text-slate-500 text-xs mb-1">{d.desc}</p>
        <p className="font-bold" style={{ color: d.color }}>
          {fmtINR(d.amt)}
        </p>
      </div>
    );
  }
  return null;
};

export default function Top10Chart() {
  const { top10 } = useDashboard();

  const data = top10.map((item) => ({
    ...item,
    label: item.id,
    color: SECTION_COLORS[item.section] ?? "#94a3b8",
  }));

  return (
    <div className="bg-white rounded-xl shadow-sm p-5">
      <h2 className="text-sm font-bold text-slate-700 mb-4">Top 10 Items by Cost</h2>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart
          layout="vertical"
          data={data}
          margin={{ top: 4, right: 16, left: 48, bottom: 4 }}
        >
          <XAxis
            type="number"
            tickFormatter={(v) =>
              v >= 100000 ? `₹${(v / 100000).toFixed(1)}L` : `₹${(v / 1000).toFixed(0)}K`
            }
            tick={{ fontSize: 10, fill: "#475569" }}
          />
          <YAxis
            type="category"
            dataKey="label"
            tick={{ fontSize: 10, fill: "#475569" }}
            width={52}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="amt" radius={[0, 5, 5, 0]}>
            {data.map((entry) => (
              <Cell key={entry.id} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
