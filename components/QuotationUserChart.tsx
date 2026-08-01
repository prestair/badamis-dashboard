"use client";

import { useMemo } from "react";
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { useQuotations } from "@/context/QuotationContext";

const COLORS = ["#2563eb", "#0f766e", "#7c3aed", "#ea580c", "#db2777", "#65a30d", "#0891b2", "#475569"];

export default function QuotationUserChart() {
  const { filteredQuotations } = useQuotations();

  const data = useMemo(() => {
    const counts = new Map<string, number>();
    for (const quotation of filteredQuotations) {
      const name = quotation.createdBy?.trim() || "Unknown";
      counts.set(name, (counts.get(name) ?? 0) + 1);
    }

    return [...counts.entries()]
      .map(([name, quotationsCreated]) => ({ name, quotationsCreated }))
      .sort((left, right) => right.quotationsCreated - left.quotationsCreated || left.name.localeCompare(right.name));
  }, [filteredQuotations]);

  return (
    <div className="bg-white rounded-xl shadow-sm p-5">
      <div className="mb-3">
        <h2 className="text-sm font-bold text-slate-700">Quotations Created per User</h2>
        <p className="mt-0.5 text-xs text-slate-400">{filteredQuotations.length} total quotations</p>
      </div>

      {data.length === 0 ? (
        <div className="flex h-[300px] items-center justify-center rounded-lg bg-slate-50 text-sm text-slate-400">
          No quotation creator data available.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={data}
              dataKey="quotationsCreated"
              nameKey="name"
              cx="50%"
              cy="46%"
              innerRadius={58}
              outerRadius={102}
              paddingAngle={2}
              stroke="#ffffff"
              strokeWidth={2}
            >
              {data.map((entry, index) => (
                <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend verticalAlign="bottom" iconType="circle" />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
