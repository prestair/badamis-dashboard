"use client";

import { useMemo, useState } from "react";
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useAuth } from "@/context/AuthContext";
import { useQuotations } from "@/context/QuotationContext";

const COLORS = ["#2563eb", "#0f766e", "#7c3aed", "#ea580c", "#db2777", "#0891b2"];
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
type UserSeries = {
  key: string;
  username: string;
  fullName: string;
  color: string;
};
type ChartPoint = {
  label: string;
  fullLabel: string;
  totalAmount: number;
  quotationCount: number;
  counts: Record<string, number>;
  monthIndex?: number;
  [key: string]: string | number | Record<string, number> | undefined;
};

function normalizeUserName(value: string) {
  return value.trim().toLocaleLowerCase();
}

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

function formatInr(value: number) {
  return `₹${value.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

function formatAxisAmount(value: number) {
  if (Math.abs(value) >= 10_000_000) return `₹${(value / 10_000_000).toFixed(1)}Cr`;
  if (Math.abs(value) >= 100_000) return `₹${(value / 100_000).toFixed(1)}L`;
  if (Math.abs(value) >= 1_000) return `₹${(value / 1_000).toFixed(0)}K`;
  return `₹${value}`;
}

function createPoint(
  label: string,
  fullLabel: string,
  userSeries: UserSeries[],
  monthIndex?: number
): ChartPoint {
  const point: ChartPoint = {
    label,
    fullLabel,
    totalAmount: 0,
    quotationCount: 0,
    counts: {},
    monthIndex,
  };

  for (const user of userSeries) {
    point[user.key] = 0;
    point.counts[user.key] = 0;
  }
  return point;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function UserAmountTooltip({ active, payload, userSeries }: any) {
  if (!active || !payload?.length) return null;
  const data = payload[0].payload as ChartPoint;
  const visibleUsers = (userSeries as UserSeries[]).filter((user) =>
    Number(data[user.key] ?? 0) > 0 || (data.counts[user.key] ?? 0) > 0
  );

  return (
    <div className="max-w-xs rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-lg">
      <p className="font-semibold text-slate-800">{data.fullLabel}</p>
      <div className="mt-1 space-y-1">
        {visibleUsers.map((user) => (
          <div key={user.key} className="flex items-center justify-between gap-4 text-xs">
            <span className="flex min-w-0 items-center gap-1.5 text-slate-600">
              <span className="h-2 w-2 flex-shrink-0 rounded-sm" style={{ backgroundColor: user.color }} />
              <span className="truncate">{user.fullName}</span>
            </span>
            <span className="whitespace-nowrap font-semibold text-slate-800">
              {formatInr(Number(data[user.key] ?? 0))}
              <span className="ml-1 font-normal text-slate-400">({data.counts[user.key] ?? 0})</span>
            </span>
          </div>
        ))}
        {visibleUsers.length === 0 && (
          <p className="text-xs text-slate-400">No quotation amount</p>
        )}
      </div>
      <div className="mt-2 flex items-center justify-between gap-4 border-t border-slate-100 pt-1.5 text-xs">
        <span className="font-semibold text-slate-600">Total · {data.quotationCount} quotations</span>
        <span className="font-bold text-emerald-700">{formatInr(data.totalAmount)}</span>
      </div>
    </div>
  );
}

export default function SectionBarChart() {
  const { users } = useAuth();
  const { quotations, filteredQuotations } = useQuotations();
  const [selectedFinancialYear, setSelectedFinancialYear] = useState(currentFinancialYearStart);
  const [selectedMonthIndex, setSelectedMonthIndex] = useState<number | null>(null);

  const userSeries = useMemo<UserSeries[]>(() => users
    .filter((user) => user.active)
    .map((user, index) => ({
      key: `user_${index}`,
      username: user.username,
      fullName: user.fullName,
      color: COLORS[index % COLORS.length],
    })), [users]);

  const ownerByAlias = useMemo(() => {
    const aliases = new Map<string, UserSeries>();
    for (const user of userSeries) {
      aliases.set(normalizeUserName(user.fullName), user);
      aliases.set(normalizeUserName(user.username), user);
    }
    return aliases;
  }, [userSeries]);

  const availableFinancialYears = useMemo(() => {
    const years = new Set<number>([currentFinancialYearStart()]);
    for (const quotation of quotations) {
      const parsed = parseQuotationDate(quotation.date);
      if (parsed) years.add(financialYearStart(parsed));
    }
    return [...years].sort((left, right) => right - left);
  }, [quotations]);

  const monthlyData = useMemo<ChartPoint[]>(() => {
    const buckets = FISCAL_MONTHS.map((month, monthIndex) => {
      const year = selectedFinancialYear + month.yearOffset;
      return createPoint(month.shortName, `${month.fullName} ${year}`, userSeries, monthIndex);
    });

    for (const quotation of filteredQuotations) {
      const parsed = parseQuotationDate(quotation.date);
      if (!parsed || financialYearStart(parsed) !== selectedFinancialYear) continue;
      const owner = ownerByAlias.get(normalizeUserName(quotation.createdBy || ""));
      if (!owner) continue;

      const monthIndex = parsed.month >= 4 ? parsed.month - 4 : parsed.month + 8;
      const bucket = buckets[monthIndex];
      const amount = Number(quotation.grandTotal) || 0;
      bucket[owner.key] = Number(bucket[owner.key] ?? 0) + amount;
      bucket.counts[owner.key] += 1;
      bucket.totalAmount += amount;
      bucket.quotationCount += 1;
    }

    return buckets;
  }, [filteredQuotations, ownerByAlias, selectedFinancialYear, userSeries]);

  const dailyData = useMemo<ChartPoint[]>(() => {
    if (selectedMonthIndex === null) return [];
    const selectedMonth = FISCAL_MONTHS[selectedMonthIndex];
    const year = selectedFinancialYear + selectedMonth.yearOffset;
    const daysInMonth = new Date(Date.UTC(year, selectedMonth.month, 0)).getUTCDate();
    const buckets = Array.from({ length: daysInMonth }, (_, index) =>
      createPoint(String(index + 1), `${index + 1} ${selectedMonth.fullName} ${year}`, userSeries)
    );

    for (const quotation of filteredQuotations) {
      const parsed = parseQuotationDate(quotation.date);
      if (!parsed || parsed.year !== year || parsed.month !== selectedMonth.month) continue;
      const owner = ownerByAlias.get(normalizeUserName(quotation.createdBy || ""));
      if (!owner) continue;

      const bucket = buckets[parsed.day - 1];
      const amount = Number(quotation.grandTotal) || 0;
      bucket[owner.key] = Number(bucket[owner.key] ?? 0) + amount;
      bucket.counts[owner.key] += 1;
      bucket.totalAmount += amount;
      bucket.quotationCount += 1;
    }

    return buckets;
  }, [filteredQuotations, ownerByAlias, selectedFinancialYear, selectedMonthIndex, userSeries]);

  const financialYearTotals = useMemo(() => userSeries.map((user) => ({
    ...user,
    amount: monthlyData.reduce((sum, month) => sum + Number(month[user.key] ?? 0), 0),
    quotationCount: monthlyData.reduce((sum, month) => sum + (month.counts[user.key] ?? 0), 0),
  })), [monthlyData, userSeries]);

  const isDailyView = selectedMonthIndex !== null;
  const selectedMonth = isDailyView ? FISCAL_MONTHS[selectedMonthIndex] : null;
  const chartData = isDailyView ? dailyData : monthlyData;

  return (
    <div className="rounded-xl bg-white p-5 shadow-sm">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-bold text-slate-700">
            {selectedMonth
              ? `Active User Amounts — ${selectedMonth.fullName} ${selectedFinancialYear + selectedMonth.yearOffset}`
              : `Active User Amounts — ${financialYearLabel(selectedFinancialYear)}`}
          </h2>
          <p className="mt-0.5 text-xs text-slate-400">
            {isDailyView
              ? "Daily grand-total amounts by quotation creator"
              : "Monthly grand-total amounts · click a month segment for day-wise data"}
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
            aria-label="Select financial year for active-user amounts"
          >
            {availableFinancialYears.map((year) => (
              <option key={year} value={year}>{financialYearLabel(year)}</option>
            ))}
          </select>
        </div>
      </div>

      {userSeries.length === 0 ? (
        <div className="flex h-[300px] items-center justify-center rounded-lg bg-slate-50 text-sm text-slate-400">
          No active users available.
        </div>
      ) : (
        <>
          <div className="mb-2 flex flex-wrap gap-2">
            {financialYearTotals.map((user) => (
              <div key={user.key} className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[10px] text-slate-500">
                <span className="mr-1.5 inline-block h-2 w-2 rounded-sm" style={{ backgroundColor: user.color }} />
                <span className="font-semibold text-slate-700">{user.fullName}</span>
                <span className="ml-1.5 font-bold text-emerald-700">{formatInr(user.amount)}</span>
                <span className="ml-1 text-slate-400">({user.quotationCount})</span>
              </div>
            ))}
          </div>

          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} margin={{ top: 12, right: 8, left: 12, bottom: isDailyView ? 28 : 8 }}>
              <XAxis
                dataKey="label"
                tick={{ fontSize: 9, fill: "#475569" }}
                interval={isDailyView ? 1 : 0}
                angle={isDailyView ? -35 : 0}
                textAnchor={isDailyView ? "end" : "middle"}
                height={isDailyView ? 48 : 30}
              />
              <YAxis
                tick={{ fontSize: 9, fill: "#475569" }}
                tickFormatter={formatAxisAmount}
                width={58}
              />
              <Tooltip content={<UserAmountTooltip userSeries={userSeries} />} />
              {userSeries.map((user) => (
                <Bar
                  key={user.key}
                  dataKey={user.key}
                  name={user.fullName}
                  stackId="active-users"
                  fill={user.color}
                >
                  {chartData.map((entry) => (
                    <Cell
                      key={`${user.key}-${entry.fullLabel}`}
                      fill={user.color}
                      cursor={isDailyView ? "default" : "pointer"}
                      onClick={isDailyView || entry.monthIndex === undefined
                        ? undefined
                        : () => setSelectedMonthIndex(entry.monthIndex ?? null)}
                    />
                  ))}
                </Bar>
              ))}
            </BarChart>
          </ResponsiveContainer>
        </>
      )}
    </div>
  );
}
