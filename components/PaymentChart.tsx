"use client";

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useDashboard } from "@/context/DashboardContext";
import { QUOTATION_META, fmtINR } from "@/lib/data";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload?.length) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 shadow text-sm">
        <p className="font-semibold text-slate-700">{payload[0].name}</p>
        <p style={{ color: payload[0].payload.color }} className="font-bold">
          {fmtINR(payload[0].value)}
        </p>
      </div>
    );
  }
  return null;
};

export default function PaymentChart() {
  const { gross } = useDashboard();
  const afterDiscount = Math.max(0, gross - QUOTATION_META.discount);

  const data = [
    { name: "60% Advance", value: Math.round(afterDiscount * 0.6), color: "#2563eb" },
    { name: "40% Before Delivery", value: Math.round(afterDiscount * 0.4), color: "#94a3b8" },
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm p-5">
      <h2 className="text-sm font-bold text-slate-700 mb-1">Payment Split</h2>
      <p className="text-xs text-slate-400 mb-3">
        Based on net amount {fmtINR(afterDiscount)}
      </p>
      <ResponsiveContainer width="100%" height={230}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={90}
            paddingAngle={3}
            dataKey="value"
          >
            {data.map((entry) => (
              <Cell key={entry.name} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend
            iconType="circle"
            iconSize={10}
            formatter={(value) => <span className="text-xs text-slate-600">{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
