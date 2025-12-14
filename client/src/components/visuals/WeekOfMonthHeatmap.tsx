import { useMemo } from "react";

interface DailyRecord {
  date: string;
  returnPct: number;
  pnl: number;
}

interface WeekOfMonthHeatmapProps {
  records: DailyRecord[];
  isLoading?: boolean;
}

const WEEKS = ["W1", "W2", "W3", "W4", "W5"];

function getWeekOfMonth(dateString: string) {
  const date = new Date(`${dateString}T00:00:00Z`);
  const firstDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
  const day = date.getUTCDate();
  const firstDayOfWeek = firstDay.getUTCDay();
  return Math.min(4, Math.floor((day + firstDayOfWeek - 1) / 7));
}

function colorTone(value: number) {
  if (value > 0.8) return "bg-emerald-100 text-emerald-900 border-emerald-200";
  if (value > 0.2) return "bg-emerald-50 text-emerald-900 border-emerald-200";
  if (value < -0.8) return "bg-rose-100 text-rose-900 border-rose-200";
  if (value < -0.2) return "bg-rose-50 text-rose-900 border-rose-200";
  return "bg-slate-50 text-slate-800 border-slate-200";
}

export function WeekOfMonthHeatmap({ records, isLoading }: WeekOfMonthHeatmapProps) {
  const weekStats = useMemo(() => {
    const buckets = WEEKS.map(label => ({ label, totalReturn: 0, totalPnl: 0, count: 0 }));
    for (const record of records) {
      const weekIdx = getWeekOfMonth(record.date);
      const bucket = buckets[weekIdx];
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
    return <div className="h-[180px] animate-pulse rounded-md bg-slate-100" data-testid="wom-loading" />;
  }

  if (!records.length) {
    return (
      <div
        className="rounded-md border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600"
        data-testid="wom-empty"
      >
        Not enough history to build week-of-month analytics.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2 md:grid-cols-3" data-testid="wom-heatmap">
      {weekStats.map(week => (
        <div
          key={week.label}
          className={`rounded-md border px-3 py-2 shadow-sm ${colorTone(week.avgReturn)}`}
        >
          <div className="flex items-center justify-between text-sm font-semibold">
            <span>{week.label}</span>
            <span>{week.avgReturn.toFixed(2)}%</span>
          </div>
          <p className="text-xs text-slate-600">{week.count} sessions · PnL {week.totalPnl.toFixed(0)}</p>
        </div>
      ))}
    </div>
  );
}
