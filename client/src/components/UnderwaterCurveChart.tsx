import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card } from "@/components/ui/card";

interface UnderwaterPoint {
  date: Date;
  drawdownPercent: number;
  daysUnderwater: number;
}

interface UnderwaterMetrics {
  curve: UnderwaterPoint[];
  maxDrawdownPct: number;
  longestDrawdownDays: number;
  averageDrawdownDays: number;
  pctTimeInDrawdown: number;
  pctTimeBelowMinus10: number;
}

interface UnderwaterCurveChartProps {
  data: UnderwaterMetrics;
}

export function UnderwaterCurveChart({ data }: UnderwaterCurveChartProps) {
  const chartData = data.curve.map(point => ({
    date: point.date.toLocaleDateString(),
    drawdown: point.drawdownPercent,
  }));

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Underwater Equity Curve</h3>
        <p className="text-sm text-muted-foreground">
          Drawdown from peak over time - understanding your portfolio's risk profile
        </p>
      </div>

      {/* Statistics Grid */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-5">
        <Card className="p-3">
          <div className="text-xs text-muted-foreground mb-1">Max Drawdown</div>
          <div className="text-lg font-semibold text-red-600">
            {data.maxDrawdownPct.toFixed(2)}%
          </div>
        </Card>

        <Card className="p-3">
          <div className="text-xs text-muted-foreground mb-1">Longest Drawdown</div>
          <div className="text-lg font-semibold">{data.longestDrawdownDays} days</div>
        </Card>

        <Card className="p-3">
          <div className="text-xs text-muted-foreground mb-1">Average Drawdown</div>
          <div className="text-lg font-semibold">{data.averageDrawdownDays} days</div>
        </Card>

        <Card className="p-3">
          <div className="text-xs text-muted-foreground mb-1">% Time in Drawdown</div>
          <div className="text-lg font-semibold">{data.pctTimeInDrawdown.toFixed(1)}%</div>
        </Card>

        <Card className="p-3">
          <div className="text-xs text-muted-foreground mb-1">% Time Below -10%</div>
          <div className="text-lg font-semibold text-red-600">
            {data.pctTimeBelowMinus10.toFixed(1)}%
          </div>
        </Card>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id="drawdownGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="oklch(var(--destructive))" stopOpacity={0.3} />
              <stop offset="100%" stopColor="oklch(var(--destructive))" stopOpacity={0.05} />
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
                  <p className="text-sm font-medium mb-1">{data.date}</p>
                  <p className="text-sm text-red-600">
                    Drawdown: {data.drawdown.toFixed(2)}%
                  </p>
                </div>
              );
            }}
          />
          <Area
            type="monotone"
            dataKey="drawdown"
            name="Portfolio Drawdown"
            stroke="#ef4444"
            fill="url(#drawdownGradient)"
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
