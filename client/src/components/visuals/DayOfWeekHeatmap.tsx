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

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];

// Enhanced color function with better gradients
function getColorClass(value: number, isPositive: boolean) {
  const absValue = Math.abs(value);
  
  if (isPositive) {
    if (absValue > 0.5) return "bg-gradient-to-br from-emerald-500 to-emerald-600 text-white border-emerald-400";
    if (absValue > 0.2) return "bg-gradient-to-br from-emerald-400 to-emerald-500 text-white border-emerald-300";
    if (absValue > 0.1) return "bg-emerald-400/80 text-white border-emerald-300";
    return "bg-emerald-400/60 text-white border-emerald-200";
  } else {
    if (absValue > 0.5) return "bg-gradient-to-br from-red-500 to-red-600 text-white border-red-400";
    if (absValue > 0.2) return "bg-gradient-to-br from-red-400 to-red-500 text-white border-red-300";
    if (absValue > 0.1) return "bg-red-400/80 text-white border-red-300";
    return "bg-red-400/60 text-white border-red-200";
  }
}

function toneForValue(value: number) {
  if (value > 0.5) return getColorClass(value, true);
  if (value > 0.1) return getColorClass(value, true);
  if (value > 0) return "bg-emerald-400/40 text-white border-emerald-200/50";
  if (value < -0.5) return getColorClass(value, false);
  if (value < -0.1) return getColorClass(value, false);
  if (value < 0) return "bg-red-400/40 text-white border-red-200/50";
  return "bg-[#2a2a2a] text-gray-300 border-[#3a3a3a]";
}

// Format currency compactly
const formatPnl = (value: number) => {
  if (Math.abs(value) >= 1000) {
    return `$${(value / 1000).toFixed(1)}k`;
  }
  return `$${value.toFixed(0)}`;
};

export function DayOfWeekHeatmap({ records, isLoading }: DayOfWeekHeatmapProps) {
  const dayStats = useMemo(() => {
    // Initialize buckets for Mon-Fri (indices 1-5 in JS Date)
    const buckets = DAYS.map(label => ({ label, totalReturn: 0, totalPnl: 0, count: 0, avgWin: 0, avgLoss: 0, winCount: 0, lossCount: 0 }));

    for (const record of records) {
      const dayOfWeek = new Date(`${record.date}T00:00:00Z`).getUTCDay();
      // Skip weekends (0 = Sunday, 6 = Saturday)
      if (dayOfWeek === 0 || dayOfWeek === 6) continue;
      
      const bucket = buckets[dayOfWeek - 1]; // Adjust index for Mon-Fri array
      bucket.totalReturn += record.returnPct;
      bucket.totalPnl += record.pnl;
      bucket.count += 1;
      
      if (record.pnl > 0) {
        bucket.avgWin += record.pnl;
        bucket.winCount += 1;
      } else if (record.pnl < 0) {
        bucket.avgLoss += record.pnl;
        bucket.lossCount += 1;
      }
    }

    return buckets.map(bucket => ({
      ...bucket,
      avgReturn: bucket.count ? bucket.totalReturn / bucket.count : 0,
      avgWin: bucket.winCount ? bucket.avgWin / bucket.winCount : 0,
      avgLoss: bucket.lossCount ? bucket.avgLoss / bucket.lossCount : 0,
      winRate: bucket.count ? (bucket.winCount / bucket.count) * 100 : 0,
    }));
  }, [records]);

  // Find best and worst days
  const bestDay = useMemo(() => {
    return dayStats.reduce((best, day) => day.avgReturn > best.avgReturn ? day : best, dayStats[0]);
  }, [dayStats]);
  
  const worstDay = useMemo(() => {
    return dayStats.reduce((worst, day) => day.avgReturn < worst.avgReturn ? day : worst, dayStats[0]);
  }, [dayStats]);

  if (isLoading) {
    return (
      <div className="space-y-3" data-testid="dow-loading">
        <div className="grid grid-cols-5 gap-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-32 skeleton-shimmer rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!records.length) {
    return (
      <div
        className="rounded-xl border border-dashed border-[#3a3a3a] bg-[#1a1a1a] px-4 py-6 text-center text-sm text-gray-400"
        data-testid="dow-empty"
      >
        <svg className="mx-auto h-10 w-10 text-gray-600 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        Not enough history to build day-of-week analytics.
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="dow-heatmap">
      {/* Main grid - 5 columns for weekdays */}
      <div className="grid grid-cols-5 gap-2 sm:gap-3">
        {dayStats.map(day => {
          const isBest = day.label === bestDay.label && day.avgReturn > 0;
          const isWorst = day.label === worstDay.label && day.avgReturn < 0;
          
          return (
            <div
              key={day.label}
              className={`
                relative rounded-xl border p-3 shadow-sm transition-all duration-200 hover:scale-[1.02]
                ${toneForValue(day.avgReturn)}
                ${isBest ? "ring-2 ring-emerald-400 ring-offset-2 ring-offset-[#0f0f0f]" : ""}
                ${isWorst ? "ring-2 ring-red-400 ring-offset-2 ring-offset-[#0f0f0f]" : ""}
              `}
            >
              {/* Day label */}
              <div className="text-center mb-2">
                <span className="text-sm font-bold">{day.label}</span>
                <p className="text-[10px] opacity-80">{day.count} trades</p>
              </div>
              
              {/* Main metric - Avg P&L */}
              <div className="text-center mb-2">
                <span className="text-xl sm:text-2xl font-bold block">
                  {formatPnl(day.totalPnl / (day.count || 1))}
                </span>
                <span className="text-[10px] opacity-80">Avg P&L</span>
              </div>
              
              {/* Win rate */}
              <div className="text-center mb-1">
                <span className="text-sm font-semibold">{day.winRate.toFixed(1)}%</span>
                <span className="text-[10px] opacity-80 block">Win Rate</span>
              </div>
              
              {/* Avg Win / Loss */}
              <div className="grid grid-cols-2 gap-1 text-[10px] mt-2 pt-2 border-t border-white/20">
                <div className="text-center">
                  <span className="font-medium block">{formatPnl(day.avgWin)}</span>
                  <span className="opacity-70">Avg Win</span>
                </div>
                <div className="text-center">
                  <span className="font-medium block">{formatPnl(Math.abs(day.avgLoss))}</span>
                  <span className="opacity-70">Avg Loss</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Legend */}
      <div className="flex items-center justify-center gap-4 text-xs text-gray-400">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-emerald-500" />
          <span>Best Day</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-[#2a2a2a] border border-[#3a3a3a]" />
          <span>Neutral</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-red-500" />
          <span>Worst Day</span>
        </div>
      </div>
    </div>
  );
}
