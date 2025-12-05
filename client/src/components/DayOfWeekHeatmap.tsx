import { Card } from "@/components/ui/card";

interface DayOfWeekPerformance {
  dayName: string;
  dayNumber: number;
  trades: number;
  totalPnL: number;
  avgPnL: number;
  winRate: number;
  avgWin: number;
  avgLoss: number;
}

interface DayOfWeekHeatmapProps {
  data: DayOfWeekPerformance[];
}

export function DayOfWeekHeatmap({ data }: DayOfWeekHeatmapProps) {
  // Filter out days with no trades and sort Monday-Friday
  const tradingDays = data
    .filter(d => d.trades > 0 && d.dayNumber >= 1 && d.dayNumber <= 5)
    .sort((a, b) => a.dayNumber - b.dayNumber);

  if (tradingDays.length === 0) {
    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold">Day-of-Week Performance</h3>
          <p className="text-sm text-muted-foreground">
            No trading data available
          </p>
        </div>
      </div>
    );
  }

  // Calculate min/max for color scaling
  const avgPnLs = tradingDays.map(d => d.avgPnL);
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
        <h3 className="text-lg font-semibold">Day-of-Week Performance</h3>
        <p className="text-sm text-muted-foreground">
          Average P&L and win rate by trading day
        </p>
      </div>

      <div className="grid grid-cols-5 gap-3">
        {tradingDays.map((day) => (
          <Card
            key={day.dayNumber}
            className="p-4 transition-all hover:shadow-md"
            style={{
              backgroundColor: getColor(day.avgPnL),
            }}
          >
            <div className="space-y-2">
              <div className="text-center">
                <p className="text-sm font-medium">{day.dayName.slice(0, 3)}</p>
                <p className="text-xs text-muted-foreground">{day.trades} trades</p>
              </div>
              
              <div className="space-y-1 text-center">
                <p className={`text-lg font-bold ${day.avgPnL >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                  ${day.avgPnL.toFixed(0)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Avg P&L
                </p>
              </div>

              <div className="space-y-1 text-center">
                <p className="text-sm font-semibold">
                  {day.winRate.toFixed(1)}%
                </p>
                <p className="text-xs text-muted-foreground">
                  Win Rate
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p className="text-green-700 font-medium">
                    ${day.avgWin.toFixed(0)}
                  </p>
                  <p className="text-muted-foreground">Avg Win</p>
                </div>
                <div>
                  <p className="text-red-700 font-medium">
                    -${day.avgLoss.toFixed(0)}
                  </p>
                  <p className="text-muted-foreground">Avg Loss</p>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded" style={{ backgroundColor: getColor(absMax) }} />
          <span>Best Day</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded bg-muted" />
          <span>Neutral</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded" style={{ backgroundColor: getColor(-absMax) }} />
          <span>Worst Day</span>
        </div>
      </div>
    </div>
  );
}
