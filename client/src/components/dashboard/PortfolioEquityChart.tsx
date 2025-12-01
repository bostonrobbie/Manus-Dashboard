import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { StatsPanel } from "./StatsPanel";

export interface EquityPoint {
  date: string;
  value: number;
  benchmark?: number;
}

interface PortfolioEquityChartProps {
  equitySeries: EquityPoint[];
  stats?: { sharpe?: number; maxDrawdownPct?: number; winRatePct?: number; tradeCount?: number };
  title?: string;
}

export function PortfolioEquityChart({ equitySeries, stats, title }: PortfolioEquityChartProps) {
  const data = (equitySeries ?? []).map(point => ({
    date: point.date,
    value: point.value,
    benchmark: point.benchmark,
  }));

  return (
    <div className="relative h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
          <YAxis
            tickFormatter={val => `$${Number(val).toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip formatter={val => `$${Number(val).toLocaleString()}`} />
          <Line type="monotone" dataKey="value" stroke="#0f172a" strokeWidth={2} dot={false} name={title ?? "Equity"} />
          <Line type="monotone" dataKey="benchmark" stroke="#1d4ed8" strokeWidth={1.5} dot={false} name="Benchmark" />
        </LineChart>
      </ResponsiveContainer>
      <div className="absolute left-3 top-3 w-40">
        <StatsPanel
          title="Stats"
          sharpe={stats?.sharpe}
          maxDrawdown={stats?.maxDrawdownPct}
          winRate={stats?.winRatePct}
          tradeCount={stats?.tradeCount}
        />
      </div>
    </div>
  );
}
