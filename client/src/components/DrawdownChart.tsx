import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { cn } from "../lib/utils";

export interface DrawdownSeries {
  key: string;
  name: string;
  color: string;
}

interface DrawdownChartProps {
  data: Array<Record<string, string | number>>;
  series: DrawdownSeries[];
  isLoading?: boolean;
  height?: number;
  valueFormatter?: (value: number) => string;
  className?: string;
  emptyMessage?: string;
}

const defaultPercent = (value: number) => `${value.toFixed(2)}%`;

function DrawdownChart({
  data,
  series,
  isLoading,
  height = 240,
  valueFormatter = defaultPercent,
  className,
  emptyMessage = "No drawdown data available for this selection.",
}: DrawdownChartProps) {
  return (
    <div className={cn("w-full", className)} style={{ height }}>
      {isLoading ? (
        <div className="h-full animate-pulse rounded bg-slate-100" />
      ) : data.length === 0 ? (
        <div className="flex h-full items-center justify-center rounded border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-600">
          {emptyMessage}
        </div>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis tickFormatter={value => valueFormatter(Number(value))} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
            <Tooltip formatter={value => valueFormatter(Number(value))} />
            {series.map(area => (
              <Area
                key={area.key}
                type="monotone"
                dataKey={area.key}
                name={area.name}
                stroke={area.color}
                fill={`${area.color}22`}
              />
            ))}
            <Legend />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

export default DrawdownChart;
