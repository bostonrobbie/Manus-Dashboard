import React, { useMemo } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from "recharts";

import { StatsPanel } from "./StatsPanel";
import { downsampleEveryNth } from "../../lib/downsample";

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

// Custom tooltip component
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || !payload.length) return null;
  
  return (
    <div className="bg-[#1e1e1e] border border-[#3a3a3a] rounded-lg p-3 shadow-xl min-w-[140px]">
      <p className="text-white font-semibold text-sm mb-2">{label}</p>
      <div className="space-y-1.5">
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div 
                className="w-2.5 h-2.5 rounded-full" 
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-gray-400 text-xs">{entry.name}</span>
            </div>
            <span className="text-white font-medium text-xs">
              ${Number(entry.value).toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

// Format date for X-axis
const formatXAxisDate = (dateStr: string, dataLength: number) => {
  if (!dateStr) return "";
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    if (dataLength > 100) {
      return date.toLocaleDateString(undefined, { month: "short", year: "2-digit" });
    }
    if (dataLength > 30) {
      return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    }
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch {
    return dateStr;
  }
};

export function PortfolioEquityChart({ equitySeries, stats, title }: PortfolioEquityChartProps) {
  const data = useMemo(
    () =>
      downsampleEveryNth(
        (equitySeries ?? []).map(point => ({
          date: point.date,
          value: point.value,
          benchmark: point.benchmark,
        })),
      ),
    [equitySeries],
  );

  return (
    <div className="relative h-72 sm:h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#2a2a2a" />
          
          <XAxis 
            dataKey="date" 
            tick={{ fontSize: 10, fill: "#9ca3af", fontWeight: 500 }} 
            tickLine={false} 
            axisLine={{ stroke: "#2a2a2a" }}
            tickFormatter={(value) => formatXAxisDate(value, data.length)}
            interval="preserveStartEnd"
            minTickGap={40}
          />
          
          <YAxis
            domain={["dataMin", "dataMax"]}
            tickFormatter={val => {
              const num = Number(val);
              if (num >= 1000000) return `$${(num / 1000000).toFixed(1)}M`;
              if (num >= 1000) return `$${(num / 1000).toFixed(0)}k`;
              return `$${num.toFixed(0)}`;
            }}
            tick={{ fontSize: 10, fill: "#9ca3af", fontWeight: 500 }}
            tickLine={false}
            axisLine={{ stroke: "#2a2a2a" }}
            width={55}
          />
          
          <Tooltip content={<CustomTooltip />} />
          
          <Line 
            type="monotone" 
            dataKey="value" 
            stroke="#3b82f6" 
            strokeWidth={2} 
            dot={false} 
            name={title ?? "Portfolio"}
            activeDot={{ r: 4, fill: "#3b82f6", stroke: "#1e1e1e", strokeWidth: 2 }}
          />
          <Line 
            type="monotone" 
            dataKey="benchmark" 
            stroke="#6b7280" 
            strokeWidth={1.5} 
            dot={false} 
            name="Benchmark"
            activeDot={{ r: 3, fill: "#6b7280", stroke: "#1e1e1e", strokeWidth: 2 }}
          />
          
          <Legend 
            verticalAlign="bottom"
            height={30}
            iconType="line"
            iconSize={12}
            wrapperStyle={{ paddingTop: "10px", fontSize: "11px" }}
            formatter={(value) => <span style={{ color: "#9ca3af", marginLeft: "4px" }}>{value}</span>}
          />
        </LineChart>
      </ResponsiveContainer>
      
      {/* Stats panel overlay */}
      <div className="absolute left-3 top-3 w-36 sm:w-40">
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

export const MemoizedPortfolioEquityChart = React.memo(PortfolioEquityChart);
