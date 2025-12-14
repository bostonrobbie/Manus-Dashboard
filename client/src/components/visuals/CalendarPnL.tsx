import { useMemo } from "react";

interface DailyRecord {
  date: string;
  pnl: number;
  returnPct: number;
}

interface CalendarPnLProps {
  records: DailyRecord[];
  isLoading?: boolean;
}

function color(value: number) {
  if (value > 0.8) return "bg-emerald-600";
  if (value > 0.2) return "bg-emerald-400";
  if (value > 0) return "bg-emerald-200";
  if (value < -0.8) return "bg-rose-600";
  if (value < -0.2) return "bg-rose-400";
  if (value < 0) return "bg-rose-200";
  return "bg-slate-200";
}

export function CalendarPnL({ records, isLoading }: CalendarPnLProps) {
  const recent = useMemo(() => {
    return [...records]
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-28);
  }, [records]);

  if (isLoading) {
    return <div className="h-[160px] animate-pulse rounded-md bg-slate-100" data-testid="calendar-loading" />;
  }

  if (!recent.length) {
    return (
      <div
        className="rounded-md border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600"
        data-testid="calendar-empty"
      >
        Recent PnL calendar will appear after trades are ingested.
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-1" data-testid="calendar-pnl">
      {recent.map(day => (
        <div
          key={day.date}
          className={`flex h-8 w-8 items-center justify-center rounded ${color(day.returnPct)}`}
          title={`${day.date}: ${day.pnl.toFixed(0)} (${day.returnPct.toFixed(2)}%)`}
        >
          <span className="text-[10px] font-semibold text-slate-900">{day.date.slice(-2)}</span>
        </div>
      ))}
    </div>
  );
}
