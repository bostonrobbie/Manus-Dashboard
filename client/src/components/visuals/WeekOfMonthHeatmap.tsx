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

const WEEKS = [
  { label: "W1", fullLabel: "Week 1" },
  { label: "W2", fullLabel: "Week 2" },
  { label: "W3", fullLabel: "Week 3" },
  { label: "W4", fullLabel: "Week 4" },
  { label: "W5", fullLabel: "Week 5" },
];

function getWeekOfMonth(dateString: string) {
  const date = new Date(`${dateString}T00:00:00Z`);
  const firstDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
  const day = date.getUTCDate();
  const firstDayOfWeek = firstDay.getUTCDay();
  return Math.min(4, Math.floor((day + firstDayOfWeek - 1) / 7));
}

function colorTone(value: number) {
  if (value > 0.5) return "bg-gradient-to-br from-emerald-500 to-emerald-600 text-white border-emerald-400";
  if (value > 0.2) return "bg-gradient-to-br from-emerald-400 to-emerald-500 text-white border-emerald-300";
  if (value > 0) return "bg-emerald-400/60 text-white border-emerald-200";
  if (value < -0.5) return "bg-gradient-to-br from-red-500 to-red-600 text-white border-red-400";
  if (value < -0.2) return "bg-gradient-to-br from-red-400 to-red-500 text-white border-red-300";
  if (value < 0) return "bg-red-400/60 text-white border-red-200";
  return "bg-[#2a2a2a] text-gray-300 border-[#3a3a3a]";
}

// Format currency compactly
const formatPnl = (value: number) => {
  if (Math.abs(value) >= 1000) {
    return `$${(value / 1000).toFixed(1)}k`;
  }
  return `$${value.toFixed(0)}`;
};

export function WeekOfMonthHeatmap({ records, isLoading }: WeekOfMonthHeatmapProps) {
  const weekStats = useMemo(() => {
    const buckets = WEEKS.map(w => ({ 
      label: w.label, 
      fullLabel: w.fullLabel,
      totalReturn: 0, 
      totalPnl: 0, 
      count: 0,
      avgWin: 0,
      avgLoss: 0,
      winCount: 0,
      lossCount: 0
    }));
    
    for (const record of records) {
      const weekIdx = getWeekOfMonth(record.date);
      const bucket = buckets[weekIdx];
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
      avgPnl: bucket.count ? bucket.totalPnl / bucket.count : 0,
      avgWin: bucket.winCount ? bucket.avgWin / bucket.winCount : 0,
      avgLoss: bucket.lossCount ? bucket.avgLoss / bucket.lossCount : 0,
      winRate: bucket.count ? (bucket.winCount / bucket.count) * 100 : 0,
    }));
  }, [records]);

  // Find best and worst weeks
  const bestWeek = useMemo(() => {
    return weekStats.reduce((best, week) => week.avgReturn > best.avgReturn ? week : best, weekStats[0]);
  }, [weekStats]);
  
  const worstWeek = useMemo(() => {
    return weekStats.reduce((worst, week) => week.avgReturn < worst.avgReturn ? week : worst, weekStats[0]);
  }, [weekStats]);

  if (isLoading) {
    return (
      <div className="space-y-3" data-testid="wom-loading">
        <div className="grid grid-cols-5 gap-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-28 skeleton-shimmer rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!records.length) {
    return (
      <div
        className="rounded-xl border border-dashed border-[#3a3a3a] bg-[#1a1a1a] px-4 py-6 text-center text-sm text-gray-400"
        data-testid="wom-empty"
      >
        <svg className="mx-auto h-10 w-10 text-gray-600 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        Not enough history to build week-of-month analytics.
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="wom-heatmap">
      {/* Main grid - 5 columns for weeks */}
      <div className="grid grid-cols-5 gap-2 sm:gap-3">
        {weekStats.map(week => {
          const isBest = week.label === bestWeek.label && week.avgReturn > 0;
          const isWorst = week.label === worstWeek.label && week.avgReturn < 0;
          
          return (
            <div
              key={week.label}
              className={`
                relative rounded-xl border p-3 shadow-sm transition-all duration-200 hover:scale-[1.02]
                ${colorTone(week.avgReturn)}
                ${isBest ? "ring-2 ring-emerald-400 ring-offset-2 ring-offset-[#0f0f0f]" : ""}
                ${isWorst ? "ring-2 ring-red-400 ring-offset-2 ring-offset-[#0f0f0f]" : ""}
              `}
            >
              {/* Week label */}
              <div className="text-center mb-2">
                <span className="text-sm font-bold">{week.label}</span>
                <p className="text-[10px] opacity-80">{week.count} days</p>
              </div>
              
              {/* Main metric - Avg P&L */}
              <div className="text-center mb-2">
                <span className="text-lg sm:text-xl font-bold block">
                  {formatPnl(week.avgPnl)}
                </span>
                <span className="text-[10px] opacity-80">Avg P&L</span>
              </div>
              
              {/* Win rate */}
              <div className="text-center">
                <span className="text-sm font-semibold">{week.winRate.toFixed(0)}%</span>
                <span className="text-[10px] opacity-80 block">Win Rate</span>
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Legend */}
      <div className="flex items-center justify-center gap-4 text-xs text-gray-400">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-emerald-500" />
          <span>Best Week</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-[#2a2a2a] border border-[#3a3a3a]" />
          <span>Neutral</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-red-500" />
          <span>Worst Week</span>
        </div>
      </div>
    </div>
  );
}
