import React, { useMemo } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { cn } from "../lib/utils";
import { downsampleEveryNth } from "../lib/downsample";

export interface EquitySeries {
  key: string;
  name: string;
  color: string;
}

interface EquityChartProps {
  data: Array<Record<string, string | number>>;
  series: EquitySeries[];
  isLoading?: boolean;
  height?: number;
  valueFormatter?: (value: number) => string;
  className?: string;
  emptyMessage?: string;
  dataTestId?: string;
}

const defaultCurrency = new Intl.NumberFormat(undefined, {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

function EquityChart({
  data,
  series,
  isLoading,
  height = 320,
  valueFormatter = value => defaultCurrency.format(value),
  className,
  emptyMessage = "No equity data available for this selection.",
  dataTestId,
}: EquityChartProps) {
  const chartData = useMemo(() => downsampleEveryNth(data), [data]);

  return (
    <div className={cn("w-full", className)} style={{ height }} data-testid={dataTestId}>
      {isLoading ? (
        <div className="h-full animate-pulse rounded bg-slate-100" />
      ) : chartData.length === 0 ? (
        <div className="flex h-full items-center justify-center rounded border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-600">
          {emptyMessage}
        </div>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis tickFormatter={value => valueFormatter(Number(value))} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
            <Tooltip formatter={value => valueFormatter(Number(value))} />
            {series.map(line => (
              <Line key={line.key} type="monotone" dataKey={line.key} name={line.name} stroke={line.color} dot={false} strokeWidth={2} />
            ))}
            <Legend />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

export default React.memo(EquityChart);
