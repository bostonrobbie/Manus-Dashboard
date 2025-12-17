import React, { useMemo, useCallback } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  ReferenceLine,
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
  showGrid?: boolean;
  showLegend?: boolean;
  showTooltip?: boolean;
  animate?: boolean;
}

const defaultCurrency = new Intl.NumberFormat(undefined, {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

// Enhanced axis tick styling for better visibility
const axisTickStyle = {
  fontSize: 11,
  fontWeight: 500,
  fill: "#9ca3af",
};

const xAxisTickStyle = {
  ...axisTickStyle,
  fontSize: 10,
};

// Custom tooltip component for better mobile display
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

// Format date for X-axis based on data density
const formatXAxisDate = (dateStr: string, dataLength: number) => {
  if (!dateStr) return "";
  
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    
    // For dense data, show shorter format
    if (dataLength > 100) {
      return date.toLocaleDateString(undefined, { month: "short", year: "2-digit" });
    }
    // For medium density
    if (dataLength > 30) {
      return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    }
    // For sparse data, show full date
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "2-digit" });
  } catch {
    return dateStr;
  }
};

// Format Y-axis values for better readability
const formatYAxisValue = (value: number, formatter: (v: number) => string) => {
  // For large numbers, use compact notation
  if (Math.abs(value) >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  if (Math.abs(value) >= 1000) {
    return `$${(value / 1000).toFixed(0)}k`;
  }
  return formatter(value);
};

function EquityChart({
  data,
  series,
  isLoading,
  height = 320,
  valueFormatter = value => defaultCurrency.format(value),
  className,
  emptyMessage = "No equity data available for this selection.",
  dataTestId,
  showGrid = true,
  showLegend = true,
  showTooltip = true,
  animate = true,
}: EquityChartProps) {
  const chartData = useMemo(() => downsampleEveryNth(data), [data]);
  
  // Calculate responsive height based on screen size
  const responsiveHeight = useMemo(() => {
    if (typeof window === "undefined") return height;
    return window.innerWidth < 640 ? Math.min(height, 240) : height;
  }, [height]);
  
  // Memoized tick formatter
  const xAxisFormatter = useCallback(
    (value: string) => formatXAxisDate(value, chartData.length),
    [chartData.length]
  );
  
  const yAxisFormatter = useCallback(
    (value: number) => formatYAxisValue(value, valueFormatter),
    [valueFormatter]
  );
  
  // Calculate appropriate tick count based on data
  const xAxisTickCount = useMemo(() => {
    if (chartData.length <= 10) return chartData.length;
    if (chartData.length <= 30) return 6;
    if (chartData.length <= 100) return 8;
    return 10;
  }, [chartData.length]);

  // Loading skeleton with shimmer effect
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
  
  // Empty state
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
          <svg className="mx-auto h-12 w-12 text-gray-600 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
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
        <LineChart 
          data={chartData} 
          margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
        >
          {showGrid && (
            <CartesianGrid 
              strokeDasharray="3 3" 
              vertical={false} 
              stroke="#2a2a2a"
              strokeOpacity={0.8}
            />
          )}
          
          <XAxis 
            dataKey="date" 
            tick={xAxisTickStyle}
            tickLine={false} 
            axisLine={{ stroke: "#2a2a2a", strokeWidth: 1 }}
            tickFormatter={xAxisFormatter}
            tickCount={xAxisTickCount}
            interval="preserveStartEnd"
            minTickGap={30}
            padding={{ left: 10, right: 10 }}
          />
          
          <YAxis
            domain={["dataMin", "dataMax"]}
            tickFormatter={yAxisFormatter}
            tick={axisTickStyle}
            tickLine={false}
            axisLine={{ stroke: "#2a2a2a", strokeWidth: 1 }}
            width={60}
            tickCount={6}
            padding={{ top: 10, bottom: 10 }}
          />
          
          {showTooltip && (
            <Tooltip 
              content={<CustomTooltip valueFormatter={valueFormatter} />}
              cursor={{ stroke: "#4a4a4a", strokeDasharray: "5 5" }}
            />
          )}
          
          {series.map((line, index) => (
            <Line 
              key={line.key} 
              type="monotone" 
              dataKey={line.key} 
              name={line.name} 
              stroke={line.color} 
              dot={false} 
              strokeWidth={2}
              activeDot={{ 
                r: 4, 
                fill: line.color, 
                stroke: "#1e1e1e", 
                strokeWidth: 2 
              }}
              isAnimationActive={animate}
              animationDuration={800}
              animationEasing="ease-out"
            />
          ))}
          
          {showLegend && (
            <Legend 
              verticalAlign="bottom"
              height={36}
              iconType="line"
              iconSize={12}
              wrapperStyle={{
                paddingTop: "10px",
                fontSize: "12px",
              }}
              formatter={(value) => (
                <span style={{ color: "#e5e7eb", marginLeft: "4px" }}>{value}</span>
              )}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default React.memo(EquityChart);
