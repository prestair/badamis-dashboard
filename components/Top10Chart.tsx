"use client";

import { useMemo, useState } from "react";
import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useQuotations } from "@/context/QuotationContext";

const BAR_COLORS = ["#2563eb", "#0f766e", "#7c3aed", "#ea580c", "#db2777", "#65a30d"];
const FISCAL_MONTHS = [
  { month: 4, shortName: "Apr", fullName: "April", yearOffset: 0 },
  { month: 5, shortName: "May", fullName: "May", yearOffset: 0 },
  { month: 6, shortName: "Jun", fullName: "June", yearOffset: 0 },
  { month: 7, shortName: "Jul", fullName: "July", yearOffset: 0 },
  { month: 8, shortName: "Aug", fullName: "August", yearOffset: 0 },
  { month: 9, shortName: "Sep", fullName: "September", yearOffset: 0 },
  { month: 10, shortName: "Oct", fullName: "October", yearOffset: 0 },
  { month: 11, shortName: "Nov", fullName: "November", yearOffset: 0 },
  { month: 12, shortName: "Dec", fullName: "December", yearOffset: 0 },
  { month: 1, shortName: "Jan", fullName: "January", yearOffset: 1 },
  { month: 2, shortName: "Feb", fullName: "February", yearOffset: 1 },
  { month: 3, shortName: "Mar", fullName: "March", yearOffset: 1 },
] as const;

type ParsedDate = { year: number; month: number; day: number };
type QuotationDetail = { quotationNo: string; partyName: string };
type ChartPoint = {
  label: string;
  fullLabel: string;
  quotationCount: number;
  totalValue: number;
  details: QuotationDetail[];
};
type MonthlyPoint = ChartPoint & { monthIndex: number; month: number; year: number };

function parseQuotationDate(value: string): ParsedDate | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12) return null;
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  if (day < 1 || day > daysInMonth) return null;
  return { year, month, day };
}

function financialYearStart(date: ParsedDate) {
  return date.month >= 4 ? date.year : date.year - 1;
}

function currentFinancialYearStart() {
  const now = new Date();
  return now.getMonth() + 1 >= 4 ? now.getFullYear() : now.getFullYear() - 1;
}

function financialYearLabel(startYear: number) {
  return `FY ${startYear}–${String(startYear + 1).slice(-2)}`;
}

function quotationDetail(quotationNo: string, partyName: string): QuotationDetail {
  return {
    quotationNo: quotationNo || "Without number",
    partyName: partyName || "Unnamed client",
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function QuotationTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const data = payload[0].payload as ChartPoint;

  return (
    <div className="max-w-xs rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-lg">
      <p className="font-semibold text-slate-800">{data.fullLabel}</p>
      <p className="text-slate-600">
        Quotations: <span className="font-bold text-blue-700">{data.quotationCount}</span>
      </p>
      <p className="text-slate-600">
        Total value: <span className="font-semibold text-emerald-700">₹{data.totalValue.toLocaleString("en-IN")}</span>
      </p>
      {data.details.length > 0 && (
        <div className="mt-2 max-h-28 space-y-1 overflow-y-auto border-t border-slate-100 pt-1.5">
          {data.details.slice(0, 5).map((detail, index) => (
            <p key={`${detail.quotationNo}-${index}`} className="text-[10px] leading-4 text-slate-500">
              <span className="font-mono font-semibold text-slate-700">{detail.quotationNo}</span>
              {" — "}{detail.partyName}
            </p>
          ))}
          {data.details.length > 5 && (
            <p className="text-[10px] font-semibold text-slate-400">+{data.details.length - 5} more</p>
          )}
        </div>
      )}
    </div>
  );
}

export default function Top10Chart() {
  const { filteredQuotations } = useQuotations();
  const [selectedFinancialYear, setSelectedFinancialYear] = useState(currentFinancialYearStart);
  const [selectedMonthIndex, setSelectedMonthIndex] = useState<number | null>(null);

  const availableFinancialYears = useMemo(() => {
    const years = new Set<number>([currentFinancialYearStart()]);
    for (const quotation of filteredQuotations) {
      const parsed = parseQuotationDate(quotation.date);
      if (parsed) years.add(financialYearStart(parsed));
    }
    return [...years].sort((left, right) => right - left);
  }, [filteredQuotations]);

  const monthlyData = useMemo<MonthlyPoint[]>(() => {
    const buckets = FISCAL_MONTHS.map((month, monthIndex) => {
      const year = selectedFinancialYear + month.yearOffset;
      return {
        label: month.shortName,
        fullLabel: `${month.fullName} ${year}`,
        monthIndex,
        month: month.month,
        year,
        quotationCount: 0,
        totalValue: 0,
        details: [] as QuotationDetail[],
      };
    });

    for (const quotation of filteredQuotations) {
      const parsed = parseQuotationDate(quotation.date);
      if (!parsed || financialYearStart(parsed) !== selectedFinancialYear) continue;
      const monthIndex = parsed.month >= 4 ? parsed.month - 4 : parsed.month + 8;
      const bucket = buckets[monthIndex];
      bucket.quotationCount += 1;
      bucket.totalValue += quotation.grandTotal;
      bucket.details.push(quotationDetail(quotation.quotationNo, quotation.partyName));
    }

    return buckets;
  }, [filteredQuotations, selectedFinancialYear]);

  const dailyData = useMemo<ChartPoint[]>(() => {
    if (selectedMonthIndex === null) return [];
    const selectedMonth = FISCAL_MONTHS[selectedMonthIndex];
    const year = selectedFinancialYear + selectedMonth.yearOffset;
    const daysInMonth = new Date(Date.UTC(year, selectedMonth.month, 0)).getUTCDate();
    const buckets = Array.from({ length: daysInMonth }, (_, index) => ({
      label: String(index + 1),
      fullLabel: `${index + 1} ${selectedMonth.fullName} ${year}`,
      quotationCount: 0,
      totalValue: 0,
      details: [] as QuotationDetail[],
    }));

    for (const quotation of filteredQuotations) {
      const parsed = parseQuotationDate(quotation.date);
      if (!parsed || parsed.year !== year || parsed.month !== selectedMonth.month) continue;
      const bucket = buckets[parsed.day - 1];
      bucket.quotationCount += 1;
      bucket.totalValue += quotation.grandTotal;
      bucket.details.push(quotationDetail(quotation.quotationNo, quotation.partyName));
    }

    return buckets;
  }, [filteredQuotations, selectedFinancialYear, selectedMonthIndex]);

  const isDailyView = selectedMonthIndex !== null;
  const selectedMonth = isDailyView ? FISCAL_MONTHS[selectedMonthIndex] : null;
  const chartData = isDailyView ? dailyData : monthlyData;

  return (
    <div className="rounded-xl bg-white p-5 shadow-sm">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-bold text-slate-700">
            {selectedMonth
              ? `Daily Quotations — ${selectedMonth.fullName} ${selectedFinancialYear + selectedMonth.yearOffset}`
              : `Monthly Quotations — ${financialYearLabel(selectedFinancialYear)}`}
          </h2>
          <p className="mt-0.5 text-xs text-slate-400">
            {isDailyView ? "Daily breakdown by quotation date" : "Click a month bar for its daily breakdown"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isDailyView && (
            <button
              type="button"
              onClick={() => setSelectedMonthIndex(null)}
              className="rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100"
            >
              ← Back to FY
            </button>
          )}
          <select
            value={selectedFinancialYear}
            onChange={(event) => {
              setSelectedFinancialYear(Number(event.target.value));
              setSelectedMonthIndex(null);
            }}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-300"
            aria-label="Select financial year"
          >
            {availableFinancialYears.map((year) => (
              <option key={year} value={year}>{financialYearLabel(year)}</option>
            ))}
          </select>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={chartData} margin={{ top: 20, right: 8, left: 0, bottom: isDailyView ? 28 : 8 }}>
          <XAxis
            dataKey="label"
            tick={{ fontSize: 9, fill: "#475569" }}
            interval={isDailyView ? 1 : 0}
            angle={isDailyView ? -35 : 0}
            textAnchor={isDailyView ? "end" : "middle"}
            height={isDailyView ? 48 : 30}
          />
          <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "#475569" }} width={30} />
          <Tooltip content={<QuotationTooltip />} />
          <Bar dataKey="quotationCount" name="Quotations" radius={[5, 5, 0, 0]} minPointSize={3}>
            {chartData.map((entry, index) => (
              <Cell
                key={entry.fullLabel}
                fill={BAR_COLORS[index % BAR_COLORS.length]}
                cursor={isDailyView ? "default" : "pointer"}
                onClick={isDailyView ? undefined : () => setSelectedMonthIndex((entry as MonthlyPoint).monthIndex)}
              />
            ))}
            <LabelList dataKey="quotationCount" position="top" fill="#334155" fontSize={9} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
