import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card } from "@/components/ui/card";

interface UnderwaterPoint {
  date: Date;
  drawdownPercent: number;
  daysUnderwater: number;
}

interface UnderwaterMetrics {
  curve: UnderwaterPoint[];
  longestDurationDays: number;
  averageRecoveryDays: number;
  pctDaysAtHighWater: number;
}

interface UnderwaterData {
  portfolio: UnderwaterMetrics;
  benchmark: UnderwaterMetrics;
}

interface UnderwaterCurveChartProps {
  data: UnderwaterData;
}

export function UnderwaterCurveChart({ data }: UnderwaterCurveChartProps) {
  // Combine portfolio and benchmark data by date
  const dateMap = new Map<string, { date: string; portfolioDrawdown: number; benchmarkDrawdown: number }>();

  // Add portfolio data
  data.portfolio.curve.forEach(point => {
    const dateStr = point.date.toLocaleDateString();
    dateMap.set(dateStr, {
      date: dateStr,
      portfolioDrawdown: point.drawdownPercent,
      benchmarkDrawdown: 0,
    });
  });

  // Add benchmark data
  data.benchmark.curve.forEach(point => {
    const dateStr = point.date.toLocaleDateString();
    const existing = dateMap.get(dateStr);
    if (existing) {
      existing.benchmarkDrawdown = point.drawdownPercent;
    } else {
      dateMap.set(dateStr, {
        date: dateStr,
        portfolioDrawdown: 0,
        benchmarkDrawdown: point.drawdownPercent,
      });
    }
  });

  const chartData = Array.from(dateMap.values()).sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Underwater Equity Curve</h3>
        <p className="text-sm text-muted-foreground">
          Drawdown from peak over time (negative values show distance from all-time high)
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-4">
          <h4 className="text-sm font-semibold mb-2">Portfolio Statistics</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Max Drawdown:</span>
              <span className="font-medium">
                {Math.min(...data.portfolio.curve.map(p => p.drawdownPercent)).toFixed(2)}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Longest Duration:</span>
              <span className="font-medium">{data.portfolio.longestDurationDays} days</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Avg Recovery:</span>
              <span className="font-medium">{data.portfolio.averageRecoveryDays} days</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Days at Peak:</span>
              <span className="font-medium">{data.portfolio.pctDaysAtHighWater.toFixed(1)}%</span>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <h4 className="text-sm font-semibold mb-2">S&P 500 Statistics</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Max Drawdown:</span>
              <span className="font-medium">
                {Math.min(...data.benchmark.curve.map(p => p.drawdownPercent)).toFixed(2)}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Longest Duration:</span>
              <span className="font-medium">{data.benchmark.longestDurationDays} days</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Avg Recovery:</span>
              <span className="font-medium">{data.benchmark.averageRecoveryDays} days</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Days at Peak:</span>
              <span className="font-medium">{data.benchmark.pctDaysAtHighWater.toFixed(1)}%</span>
            </div>
          </div>
        </Card>
      </div>
      
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id="portfolioGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="oklch(var(--primary))" stopOpacity={0.3} />
              <stop offset="100%" stopColor="oklch(var(--primary))" stopOpacity={0.05} />
            </linearGradient>
            <linearGradient id="benchmarkGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="oklch(var(--muted-foreground))" stopOpacity={0.2} />
              <stop offset="100%" stopColor="oklch(var(--muted-foreground))" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 12 }}
            tickFormatter={(value) => {
              const date = new Date(value);
              return date.toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
            }}
          />
          <YAxis
            tick={{ fontSize: 12 }}
            tickFormatter={(value) => `${value.toFixed(1)}%`}
            domain={['dataMin', 0]}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload || payload.length === 0) return null;
              const data = payload[0]!.payload;
              return (
                <div className="rounded-lg border bg-background p-3 shadow-lg">
                  <p className="text-sm font-medium mb-2">{data.date}</p>
                  <p className="text-sm" style={{ color: 'oklch(var(--primary))' }}>
                    Portfolio: {data.portfolioDrawdown.toFixed(2)}%
                  </p>
                  <p className="text-sm text-muted-foreground">
                    S&P 500: {data.benchmarkDrawdown.toFixed(2)}%
                  </p>
                </div>
              );
            }}
          />
          <Legend />
          <Area
            type="monotone"
            dataKey="portfolioDrawdown"
            name="Portfolio"
            stroke="oklch(var(--primary))"
            fill="url(#portfolioGradient)"
            strokeWidth={2}
          />
          <Area
            type="monotone"
            dataKey="benchmarkDrawdown"
            name="S&P 500"
            stroke="oklch(var(--muted-foreground))"
            fill="url(#benchmarkGradient)"
            strokeWidth={1.5}
            strokeDasharray="5 5"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
