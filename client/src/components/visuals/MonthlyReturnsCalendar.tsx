import { useMemo } from "react";

interface EquityRecord {
  date: string;
  equity: number;
}

interface MonthlyReturnsCalendarProps {
  records: EquityRecord[];
  isLoading?: boolean;
}

function formatMonth(label: string) {
  const [year, month] = label.split("-").map(part => Number(part));
  const date = new Date(Date.UTC(year, (month || 1) - 1, 1));
  return date.toLocaleString(undefined, { month: "short", year: "numeric" });
}

function tone(value: number) {
  if (value > 4) return "bg-emerald-100 text-emerald-900 border-emerald-200";
  if (value > 0) return "bg-emerald-50 text-emerald-900 border-emerald-200";
  if (value < -4) return "bg-rose-100 text-rose-900 border-rose-200";
  if (value < 0) return "bg-rose-50 text-rose-900 border-rose-200";
  return "bg-slate-50 text-slate-800 border-slate-200";
}

export function MonthlyReturnsCalendar({ records, isLoading }: MonthlyReturnsCalendarProps) {
  const monthly = useMemo(() => {
    const byMonth = new Map<string, { start?: number; end?: number }>();
    for (const record of records) {
      const key = record.date.slice(0, 7);
      const bucket = byMonth.get(key) ?? { start: undefined, end: undefined };
      bucket.start = bucket.start ?? record.equity;
      bucket.end = record.equity;
      byMonth.set(key, bucket);
    }

    return Array.from(byMonth.entries())
      .sort(([a], [b]) => (a > b ? 1 : -1))
      .map(([month, bucket]) => {
        const start = bucket.start ?? 0;
        const end = bucket.end ?? start;
        const pct = start ? ((end - start) / start) * 100 : 0;
        return { month, pct };
      });
  }, [records]);

  if (isLoading) {
    return <div className="h-[240px] animate-pulse rounded-md bg-slate-100" data-testid="monthly-loading" />;
  }

  if (!records.length) {
    return (
      <div
        className="rounded-md border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600"
        data-testid="monthly-empty"
      >
        Monthly return calendar will appear once trades are available.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-4" data-testid="monthly-calendar">
      {monthly.map(item => (
        <div
          key={item.month}
          className={`rounded-md border px-3 py-2 text-sm shadow-sm ${tone(item.pct)}`}
        >
          <div className="flex items-center justify-between font-semibold">
            <span>{formatMonth(item.month)}</span>
            <span>{item.pct.toFixed(2)}%</span>
          </div>
        </div>
      ))}
    </div>
  );
}
