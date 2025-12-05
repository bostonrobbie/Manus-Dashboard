import { Card } from "@/components/ui/card";

interface WeekOfMonthPerformance {
  weekNumber: number;
  weekLabel: string;
  trades: number;
  totalPnL: number;
  avgPnL: number;
  winRate: number;
  avgWin: number;
  avgLoss: number;
}

interface WeekOfMonthHeatmapProps {
  data: WeekOfMonthPerformance[];
}

export function WeekOfMonthHeatmap({ data }: WeekOfMonthHeatmapProps) {
  // Filter out weeks with no trades
  const tradingWeeks = data.filter(w => w.trades > 0);

  if (tradingWeeks.length === 0) {
    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold">Week-of-Month Performance</h3>
          <p className="text-sm text-muted-foreground">
            No trading data available
          </p>
        </div>
      </div>
    );
  }

  // Calculate min/max for color scaling
  const avgPnLs = tradingWeeks.map(w => w.avgPnL);
  const minAvg = Math.min(...avgPnLs);
  const maxAvg = Math.max(...avgPnLs);
  const absMax = Math.max(Math.abs(minAvg), Math.abs(maxAvg));

  const getColor = (value: number) => {
    if (absMax === 0) return "oklch(var(--muted))";
    const intensity = Math.abs(value) / absMax;
    if (value > 0) {
      // Green for positive
      return `oklch(${0.65 + intensity * 0.15} ${0.15 + intensity * 0.1} 145)`;
    } else {
      // Red for negative
      return `oklch(${0.65 - intensity * 0.15} ${0.15 + intensity * 0.1} 25)`;
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Week-of-Month Performance</h3>
        <p className="text-sm text-muted-foreground">
          Average P&L and win rate by week of month (Week 1: days 1-7, Week 2: 8-14, etc.)
        </p>
      </div>

      <div className="grid grid-cols-5 gap-3">
        {tradingWeeks.map((week) => (
          <Card
            key={week.weekNumber}
            className="p-4 transition-all hover:shadow-md"
            style={{
              backgroundColor: getColor(week.avgPnL),
            }}
          >
            <div className="space-y-2">
              <div className="text-center">
                <p className="text-base font-semibold text-white">{week.weekLabel}</p>
                <p className="text-sm text-white/90">{week.trades} trades</p>
              </div>
              
              <div className="space-y-1 text-center">
                <p className="text-2xl font-bold text-white">
                  ${week.avgPnL.toFixed(0)}
                </p>
                <p className="text-sm text-white/90">
                  Avg P&L
                </p>
              </div>

              <div className="space-y-1 text-center">
                <p className="text-lg font-semibold text-white">
                  {week.winRate.toFixed(1)}%
                </p>
                <p className="text-sm text-white/90">
                  Win Rate
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-white font-semibold">
                    ${week.avgWin.toFixed(0)}
                  </p>
                  <p className="text-white/80">Avg Win</p>
                </div>
                <div>
                  <p className="text-white font-semibold">
                    -${week.avgLoss.toFixed(0)}
                  </p>
                  <p className="text-white/80">Avg Loss</p>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded" style={{ backgroundColor: getColor(absMax) }} />
          <span>Best Week</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded bg-muted" />
          <span>Neutral</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded" style={{ backgroundColor: getColor(-absMax) }} />
          <span>Worst Week</span>
        </div>
      </div>
    </div>
  );
}
