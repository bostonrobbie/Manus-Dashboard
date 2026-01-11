import { trpc } from "@/lib/trpc";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { useMemo } from "react";

interface LandingEquityChartProps {
  strategyVariant: "unleveraged" | "leveraged";
}

interface EquityPoint {
  date: string;
  equity: number;
  drawdown: number;
}

export function LandingEquityChart({
  strategyVariant,
}: LandingEquityChartProps) {
  // Fetch public strategies list to get the correct strategy ID
  const { data: strategies } = trpc.publicApi.listStrategies.useQuery();

  // Get the strategy ID based on variant
  const strategyId = useMemo(() => {
    if (!strategies) return undefined;
    const symbol =
      strategyVariant === "leveraged" ? "NQTrendLeveraged" : "NQTrend";
    const strategy = strategies.find(s => s.symbol === symbol);
    return strategy?.id;
  }, [strategies, strategyVariant]);

  // Fetch public strategy detail with equity curve
  const { data, isLoading } = trpc.publicApi.strategyDetail.useQuery(
    {
      strategyId: strategyId!,
      timeRange: "ALL",
      startingCapital: 10000,
    },
    {
      enabled: !!strategyId,
      staleTime: 5 * 60 * 1000,
    }
  );

  // Process chart data
  const chartData = useMemo(() => {
    if (!data?.equityCurve || data.equityCurve.length === 0) return [];

    // Sample data to reduce points for performance
    const equity = data.equityCurve as EquityPoint[];
    const maxPoints = 200;
    const step = Math.max(1, Math.floor(equity.length / maxPoints));

    return equity
      .filter(
        (_: EquityPoint, index: number) =>
          index % step === 0 || index === equity.length - 1
      )
      .map((point: EquityPoint) => ({
        date: new Date(point.date).toLocaleDateString("en-US", {
          month: "short",
          year: "2-digit",
        }),
        equity: point.equity,
      }));
  }, [data?.equityCurve]);

  if (isLoading || !chartData.length) {
    return (
      <div className="h-[300px] bg-gray-900/50 rounded-xl border border-gray-800 flex items-center justify-center">
        <div className="text-gray-400">Loading equity curve...</div>
      </div>
    );
  }

  const startingCapital = 10000;
  const isLeveraged = strategyVariant === "leveraged";

  return (
    <div className="bg-gray-900/50 rounded-xl border border-gray-800 p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-white">
            NQ Trend Equity Curve
          </h3>
          <p className="text-sm text-gray-400">
            {isLeveraged
              ? "Leveraged (% Equity Scaling)"
              : "Unleveraged (Fixed Contracts)"}
          </p>
        </div>
        <div className="text-right">
          <div className="text-sm text-gray-400">Starting Capital</div>
          <div className="text-lg font-semibold text-emerald-400">$10,000</div>
        </div>
      </div>

      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 10, right: 10, left: 10, bottom: 10 }}
          >
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: "#9ca3af" }}
              tickLine={{ stroke: "rgba(255,255,255,0.2)" }}
              axisLine={{ stroke: "rgba(255,255,255,0.2)" }}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 10, fill: "#9ca3af" }}
              tickLine={{ stroke: "rgba(255,255,255,0.2)" }}
              axisLine={{ stroke: "rgba(255,255,255,0.2)" }}
              tickFormatter={value => {
                if (value >= 1000000)
                  return `$${(value / 1000000).toFixed(1)}M`;
                if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
                return `$${value}`;
              }}
              width={55}
            />
            <Tooltip
              formatter={(value: number) => [
                `$${value.toLocaleString()}`,
                "Portfolio",
              ]}
              labelStyle={{ color: "black" }}
              contentStyle={{
                backgroundColor: "#1f2937",
                border: "1px solid #374151",
                borderRadius: "8px",
              }}
            />
            <ReferenceLine
              y={startingCapital}
              stroke="#10b981"
              strokeWidth={1}
              strokeDasharray="4 4"
            />
            <Line
              type="monotone"
              dataKey="equity"
              stroke={isLeveraged ? "#10b981" : "#60a5fa"}
              strokeWidth={2}
              dot={false}
              name="Portfolio"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 flex justify-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div
            className={`w-3 h-0.5 ${isLeveraged ? "bg-emerald-500" : "bg-blue-400"}`}
          ></div>
          <span className="text-gray-400">Portfolio Value</span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-0.5 bg-emerald-500 opacity-50"
            style={{ borderTop: "1px dashed #10b981" }}
          ></div>
          <span className="text-gray-400">Starting Capital</span>
        </div>
      </div>
    </div>
  );
}
