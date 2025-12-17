import React, { useMemo, useCallback } from "react";
import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { cn } from "../lib/utils";
import { downsampleEveryNth } from "../lib/downsample";

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
  dataTestId?: string;
}

const defaultPercent = (value: number) => `${value.toFixed(2)}%`;

// Enhanced axis tick styling for better visibility
const axisTickStyle = {
  fontSize: 11,
  fontWeight: 500,
  fill: "#9ca3af",
};

// Custom tooltip component
const CustomTooltip = ({ 
  active, 
  payload, 
  label, 
  valueFormatter 
}: { 
  active?: boolean; 
  payload?: Array<{ name: string; value: number; color: string }>; 
  label?: string;
  valueFormatter: (value: number) => string;
}) => {
  if (!active || !payload || !payload.length) return null;
  
  return (
    <div className="bg-[#1e1e1e] border border-[#3a3a3a] rounded-lg p-3 shadow-xl min-w-[140px]">
      <p className="text-white font-semibold text-sm mb-2">{label}</p>
      <div className="space-y-1.5">
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div 
                className="w-2.5 h-2.5 rounded-full" 
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-gray-400 text-xs">{entry.name}</span>
            </div>
            <span className="text-white font-medium text-xs">
              {valueFormatter(entry.value)}
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
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "2-digit" });
  } catch {
    return dateStr;
  }
};

function DrawdownChart({
  data,
  series,
  isLoading,
  height = 240,
  valueFormatter = defaultPercent,
  className,
  emptyMessage = "No drawdown data available for this selection.",
  dataTestId,
}: DrawdownChartProps) {
  const chartData = useMemo(() => downsampleEveryNth(data), [data]);
  
  const responsiveHeight = useMemo(() => {
    if (typeof window === "undefined") return height;
    return window.innerWidth < 640 ? Math.min(height, 200) : height;
  }, [height]);
  
  const xAxisFormatter = useCallback(
    (value: string) => formatXAxisDate(value, chartData.length),
    [chartData.length]
  );

  if (isLoading) {
    return (
      <div 
        className={cn("w-full rounded-lg overflow-hidden", className)} 
        style={{ height: responsiveHeight }}
        data-testid={dataTestId}
      >
        <div className="h-full skeleton-shimmer rounded-lg" />
      </div>
    );
  }
  
  if (chartData.length === 0) {
    return (
      <div 
        className={cn(
          "flex h-full items-center justify-center rounded-lg border border-dashed border-[#3a3a3a] bg-[#1a1a1a] text-sm text-gray-400",
          className
        )} 
        style={{ height: responsiveHeight }}
        data-testid={dataTestId}
      >
        <div className="text-center px-4">
          <svg className="mx-auto h-10 w-10 text-gray-600 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
          </svg>
          <p>{emptyMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={cn("w-full chart-container", className)} 
      style={{ height: responsiveHeight }} 
      data-testid={dataTestId}
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            {series.map((s) => (
              <linearGradient key={`gradient-${s.key}`} id={`gradient-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={s.color} stopOpacity={0.3}/>
                <stop offset="95%" stopColor={s.color} stopOpacity={0.05}/>
              </linearGradient>
            ))}
          </defs>
          
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#2a2a2a" strokeOpacity={0.8} />
          
          <XAxis 
            dataKey="date" 
            tick={{ fontSize: 10, fontWeight: 500, fill: "#9ca3af" }}
            tickLine={false} 
            axisLine={{ stroke: "#2a2a2a", strokeWidth: 1 }}
            tickFormatter={xAxisFormatter}
            interval="preserveStartEnd"
            minTickGap={30}
            padding={{ left: 10, right: 10 }}
          />
          
          <YAxis 
            domain={["dataMin", 0]}
            tickFormatter={value => `${Number(value).toFixed(0)}%`} 
            tick={axisTickStyle} 
            tickLine={false} 
            axisLine={{ stroke: "#2a2a2a", strokeWidth: 1 }}
            width={50}
            tickCount={5}
          />
          
          <Tooltip 
            content={<CustomTooltip valueFormatter={valueFormatter} />}
            cursor={{ stroke: "#4a4a4a", strokeDasharray: "5 5" }}
          />
          
          {series.map(area => (
            <Area
              key={area.key}
              type="monotone"
              dataKey={area.key}
              name={area.name}
              stroke={area.color}
              fill={`url(#gradient-${area.key})`}
              strokeWidth={2}
              activeDot={{ r: 4, fill: area.color, stroke: "#1e1e1e", strokeWidth: 2 }}
              isAnimationActive={true}
              animationDuration={800}
            />
          ))}
          
          <Legend 
            verticalAlign="bottom"
            height={36}
            iconType="line"
            iconSize={12}
            wrapperStyle={{ paddingTop: "10px", fontSize: "12px" }}
            formatter={(value) => <span style={{ color: "#e5e7eb", marginLeft: "4px" }}>{value}</span>}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export default React.memo(DrawdownChart);
