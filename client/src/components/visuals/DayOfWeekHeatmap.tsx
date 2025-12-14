import { useMemo } from "react";

interface DailyRecord {
  date: string;
  returnPct: number;
  pnl: number;
}

interface DayOfWeekHeatmapProps {
  records: DailyRecord[];
  isLoading?: boolean;
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function toneForValue(value: number) {
  if (value > 0.5) return "bg-emerald-100 text-emerald-900 border-emerald-200";
  if (value > 0.1) return "bg-emerald-50 text-emerald-900 border-emerald-200";
  if (value < -0.5) return "bg-rose-100 text-rose-900 border-rose-200";
  if (value < -0.1) return "bg-rose-50 text-rose-900 border-rose-200";
  return "bg-slate-50 text-slate-800 border-slate-200";
}

export function DayOfWeekHeatmap({ records, isLoading }: DayOfWeekHeatmapProps) {
  const dayStats = useMemo(() => {
    const buckets = DAYS.map(label => ({ label, totalReturn: 0, totalPnl: 0, count: 0 }));

    for (const record of records) {
      const idx = new Date(`${record.date}T00:00:00Z`).getUTCDay();
      const bucket = buckets[idx];
      bucket.totalReturn += record.returnPct;
      bucket.totalPnl += record.pnl;
      bucket.count += 1;
    }

    return buckets.map(bucket => ({
      ...bucket,
      avgReturn: bucket.count ? bucket.totalReturn / bucket.count : 0,
    }));
  }, [records]);

  if (isLoading) {
    return <div className="h-[180px] animate-pulse rounded-md bg-slate-100" data-testid="dow-loading" />;
  }

  if (!records.length) {
    return (
      <div
        className="rounded-md border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600"
        data-testid="dow-empty"
      >
        Not enough history to build day-of-week analytics.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2 md:grid-cols-4" data-testid="dow-heatmap">
      {dayStats.map(day => (
        <div
          key={day.label}
          className={`rounded-md border px-3 py-2 shadow-sm ${toneForValue(day.avgReturn)}`}
        >
          <div className="flex items-center justify-between text-sm font-semibold">
            <span>{day.label}</span>
            <span>{day.avgReturn.toFixed(2)}%</span>
          </div>
          <p className="text-xs text-slate-600">{day.count} sessions · PnL {day.totalPnl.toFixed(0)}</p>
        </div>
      ))}
    </div>
  );
}
