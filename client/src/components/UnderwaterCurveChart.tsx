import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

interface UnderwaterPoint {
  date: Date;
  drawdownPercent: number;
  daysUnderwater: number;
}

interface UnderwaterCurveChartProps {
  data: UnderwaterPoint[];
}

export function UnderwaterCurveChart({ data }: UnderwaterCurveChartProps) {
  const chartData = data.map(point => ({
    date: point.date.toLocaleDateString(),
    drawdown: point.drawdownPercent,
    daysUnderwater: point.daysUnderwater,
  }));

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Underwater Equity Curve</h3>
        <p className="text-sm text-muted-foreground">
          Drawdown from peak over time (negative values show distance from all-time high)
        </p>
      </div>
      
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
              if (!active || !payload || !payload[0]) return null;
              const data = payload[0].payload;
              return (
                <div className="rounded-lg border bg-background p-3 shadow-lg">
                  <p className="text-sm font-medium">{data.date}</p>
                  <p className="text-sm text-destructive">
                    Drawdown: {data.drawdown.toFixed(2)}%
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Days Underwater: {data.daysUnderwater}
                  </p>
                </div>
              );
            }}
          />
          <Area
            type="monotone"
            dataKey="drawdown"
            stroke="oklch(var(--destructive))"
            fill="url(#drawdownGradient)"
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
