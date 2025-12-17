import { useEffect, useMemo, useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { trpc } from "../lib/trpc";
import { useDashboardState } from "../providers/DashboardProvider";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import MetricCard from "../components/MetricCard";

type SortKey =
  | "name"
  | "totalReturn"
  | "totalReturnPct"
  | "maxDrawdown"
  | "maxDrawdownPct"
  | "sharpeRatio"
  | "profitFactor"
  | "expectancy"
  | "totalTrades";

type SortOrder = "asc" | "desc";

// Enhanced strategy colors for better visibility
const STRATEGY_COLORS = [
  "#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6",
  "#06b6d4", "#ec4899", "#84cc16", "#f97316", "#14b8a6"
];

// Custom tooltip for charts
const CustomTooltip = ({ active, payload, label, currency }: any) => {
  if (!active || !payload || !payload.length) return null;
  
  return (
    <div className="bg-[#1e1e1e] border border-[#3a3a3a] rounded-lg p-3 shadow-xl">
      <p className="text-white font-semibold text-sm mb-1">{label}</p>
      <p className="text-emerald-400 font-medium">
        {currency.format(payload[0].value)}
      </p>
    </div>
  );
};

function StrategiesPage() {
  const { timeRange } = useDashboardState();
  const [sortBy, setSortBy] = useState<SortKey>("totalReturn");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [selectedStrategyId, setSelectedStrategyId] = useState<number | null>(null);

  const strategiesQuery = trpc.portfolio.strategyComparison.useQuery(
    {
      page: 1,
      pageSize: 25,
      sortBy,
      sortOrder,
      filterType: "all",
      timeRange,
    },
    { retry: 1 },
  );
  const tradesQuery = trpc.portfolio.trades.useQuery({ timeRange, page: 1, pageSize: 200 }, { retry: 1 });
  const strategyEquityQuery = trpc.portfolio.strategyEquity.useQuery(
    { strategyId: selectedStrategyId ?? 0, timeRange, maxPoints: 120 },
    { enabled: selectedStrategyId != null },
  );
  const summaryQuery = trpc.analytics.summary.useQuery({ timeRange }, { retry: 1 });

  const selectedTrades = useMemo(
    () => tradesQuery.data?.rows?.filter(trade => trade.strategyId === selectedStrategyId) ?? [],
    [selectedStrategyId, tradesQuery.data],
  );

  const handleSort = (key: SortKey) => {
    if (sortBy === key) {
      setSortOrder(prev => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(key);
      setSortOrder("desc");
    }
  };

  const currency = useMemo(
    () =>
      new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }),
    [],
  );

  const percent = useMemo(
    () =>
      new Intl.NumberFormat(undefined, {
        style: "percent",
        minimumFractionDigits: 1,
        maximumFractionDigits: 2,
      }),
    [],
  );

  const selectedStrategy = strategiesQuery.data?.rows.find(row => row.strategyId === selectedStrategyId);
  
  const aggregatedStrategyMetrics = useMemo(() => {
    const rows = strategiesQuery.data?.rows ?? [];
    if (!rows.length) return null;
    const totalTrades = rows.reduce((sum, row) => sum + row.totalTrades, 0);
    const weightFor = (row: (typeof rows)[number]) => {
      if (totalTrades === 0) return 1 / rows.length;
      return row.totalTrades / totalTrades;
    };

    return {
      name: "All Strategies",
      totalReturnPct: rows.reduce((sum, row) => sum + row.totalReturnPct * weightFor(row), 0),
      maxDrawdownPct: rows.reduce((sum, row) => sum + row.maxDrawdownPct * weightFor(row), 0),
      sharpeRatio: rows.reduce((sum, row) => sum + row.sharpeRatio * weightFor(row), 0),
      profitFactor: rows.reduce((sum, row) => sum + row.profitFactor * weightFor(row), 0),
      expectancy: rows.reduce((sum, row) => sum + (row.expectancy ?? 0) * weightFor(row), 0),
      winRatePct: rows.reduce((sum, row) => sum + row.winRatePct * weightFor(row), 0),
      totalTrades,
    };
  }, [strategiesQuery.data]);

  const focusMetrics = selectedStrategy ?? aggregatedStrategyMetrics;
  const focusTitle = selectedStrategy?.name ?? aggregatedStrategyMetrics?.name ?? "Strategy Performance";
  const strategyEquityPoints = strategyEquityQuery.data?.points ?? [];
  
  // Get color for selected strategy
  const selectedStrategyIndex = strategiesQuery.data?.rows.findIndex(r => r.strategyId === selectedStrategyId) ?? 0;
  const selectedColor = STRATEGY_COLORS[selectedStrategyIndex % STRATEGY_COLORS.length];
  
  const equityChart = (
    <div className="h-64 sm:h-72">
      {strategyEquityQuery.isFetching ? (
        <div className="h-full skeleton-shimmer rounded-lg" />
      ) : strategyEquityPoints.length ? (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={strategyEquityPoints} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#2a2a2a" />
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: 10, fill: "#9ca3af", fontWeight: 500 }} 
              tickLine={false} 
              axisLine={{ stroke: "#2a2a2a" }}
              tickFormatter={(value) => {
                const date = new Date(value);
                return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
              }}
              interval="preserveStartEnd"
              minTickGap={40}
            />
            <YAxis 
              tickFormatter={val => {
                const num = Number(val);
                if (num >= 1000000) return `$${(num / 1000000).toFixed(1)}M`;
                if (num >= 1000) return `$${(num / 1000).toFixed(0)}k`;
                return currency.format(num);
              }} 
              tick={{ fontSize: 10, fill: "#9ca3af", fontWeight: 500 }} 
              tickLine={false} 
              axisLine={{ stroke: "#2a2a2a" }}
              width={55}
            />
            <Tooltip content={<CustomTooltip currency={currency} />} />
            <Line 
              type="monotone" 
              dataKey="combined" 
              stroke={selectedColor} 
              strokeWidth={2} 
              dot={false}
              activeDot={{ r: 4, fill: selectedColor, stroke: "#1e1e1e", strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-[#3a3a3a] bg-[#1a1a1a] text-sm text-gray-400">
          <div className="text-center">
            <svg className="mx-auto h-10 w-10 text-gray-600 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Select a strategy to view its equity curve.
          </div>
        </div>
      )}
    </div>
  );

  useEffect(() => {
    if (!selectedStrategyId && strategiesQuery.data?.rows?.length) {
      setSelectedStrategyId(strategiesQuery.data.rows[0].strategyId);
    }
  }, [selectedStrategyId, strategiesQuery.data]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Trading Strategies</h2>
          <p className="text-sm text-gray-400">View detailed performance for each intraday strategy</p>
        </div>
        {strategiesQuery.isError && (
          <div className="rounded-lg bg-red-900/20 px-3 py-2 text-xs text-red-400 border border-red-800/50">
            Failed to load strategies.
          </div>
        )}
      </div>

      {/* Performance overview card */}
      <Card className="bg-[#1e1e1e] border-[#2a2a2a]">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm text-white">{focusTitle}</CardTitle>
            {selectedStrategy && (
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: selectedColor }}
              />
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Metrics grid - responsive */}
          <div className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-4">
            <MetricCard
              label="Total Return"
              value={
                focusMetrics
                  ? percent.format(("totalReturnPct" in focusMetrics ? focusMetrics.totalReturnPct : 0))
                  : summaryQuery.data
                    ? percent.format(summaryQuery.data.totalReturnPct)
                    : undefined
              }
              helper={selectedStrategy ? currency.format(selectedStrategy.totalReturn) : undefined}
              isLoading={strategiesQuery.isLoading || summaryQuery.isLoading}
            />
            <MetricCard
              label="Max Drawdown"
              value={focusMetrics ? percent.format(focusMetrics.maxDrawdownPct) : undefined}
              helper={selectedStrategy ? currency.format(selectedStrategy.maxDrawdown) : undefined}
              isLoading={strategiesQuery.isLoading}
            />
            <MetricCard
              label="Sharpe Ratio"
              value={focusMetrics ? focusMetrics.sharpeRatio.toFixed(2) : undefined}
              helper={selectedStrategy?.sortinoRatio ? `Sortino ${selectedStrategy.sortinoRatio.toFixed(2)}` : undefined}
              isLoading={strategiesQuery.isLoading}
            />
            <MetricCard
              label="Profit Factor"
              value={focusMetrics ? focusMetrics.profitFactor.toFixed(2) : undefined}
              helper={selectedStrategy?.payoffRatio ? `Payoff ${selectedStrategy.payoffRatio.toFixed(2)}` : undefined}
              isLoading={strategiesQuery.isLoading}
            />
          </div>
          
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <MetricCard
              label="Expectancy"
              value={
                focusMetrics
                  ? currency.format("expectancy" in focusMetrics && focusMetrics.expectancy != null ? focusMetrics.expectancy : 0)
                  : undefined
              }
              isLoading={strategiesQuery.isLoading}
            />
            <MetricCard
              label="Win Rate"
              value={focusMetrics ? percent.format((focusMetrics.winRatePct ?? 0) / 100) : undefined}
              helper={focusMetrics ? `${focusMetrics.totalTrades.toLocaleString()} trades` : undefined}
              isLoading={strategiesQuery.isLoading}
            />
            <MetricCard
              label="Trade Count"
              value={focusMetrics ? focusMetrics.totalTrades.toLocaleString() : undefined}
              isLoading={strategiesQuery.isLoading}
            />
          </div>
          
          {/* Equity chart */}
          <div className="rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] p-3">
            {equityChart}
          </div>
        </CardContent>
      </Card>

      {/* All Strategies Performance Card */}
      <Card className="bg-[#1e1e1e] border-[#2a2a2a]">
        <CardHeader>
          <CardTitle className="text-sm text-white">All Strategies Performance</CardTitle>
          <p className="text-xs text-gray-400">Compare all strategy equity curves</p>
        </CardHeader>
        <CardContent>
          <div className="h-64 sm:h-80">
            {strategiesQuery.isLoading ? (
              <div className="h-full skeleton-shimmer rounded-lg" />
            ) : strategiesQuery.data?.rows?.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#2a2a2a" />
                  <XAxis 
                    dataKey="date"
                    type="category"
                    allowDuplicatedCategory={false}
                    tick={{ fontSize: 10, fill: "#9ca3af", fontWeight: 500 }}
                    tickLine={false}
                    axisLine={{ stroke: "#2a2a2a" }}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tickFormatter={val => `$${(Number(val) / 1000).toFixed(0)}k`}
                    tick={{ fontSize: 10, fill: "#9ca3af", fontWeight: 500 }}
                    tickLine={false}
                    axisLine={{ stroke: "#2a2a2a" }}
                    width={50}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "#1e1e1e", 
                      border: "1px solid #3a3a3a",
                      borderRadius: "8px",
                      fontSize: "12px"
                    }}
                    labelStyle={{ color: "#fff", fontWeight: 600 }}
                    formatter={(value: number, name: string) => [currency.format(value), name]}
                  />
                  {strategiesQuery.data.rows.map((row, index) => (
                    <Line
                      key={row.strategyId}
                      data={row.sparkline?.map((point, i) => ({ 
                        date: `Day ${i + 1}`, 
                        value: point.value 
                      })) ?? []}
                      dataKey="value"
                      name={row.name}
                      stroke={STRATEGY_COLORS[index % STRATEGY_COLORS.length]}
                      strokeWidth={selectedStrategyId === row.strategyId ? 3 : 1.5}
                      dot={false}
                      opacity={selectedStrategyId === row.strategyId ? 1 : 0.6}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-gray-400">
                No strategy data available
              </div>
            )}
          </div>
          
          {/* Legend */}
          <div className="mt-4 flex flex-wrap gap-3 justify-center">
            {strategiesQuery.data?.rows.slice(0, 8).map((row, index) => (
              <button
                key={row.strategyId}
                onClick={() => setSelectedStrategyId(row.strategyId)}
                className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs transition-all ${
                  selectedStrategyId === row.strategyId 
                    ? "bg-[#2a2a2a] ring-1 ring-blue-500" 
                    : "hover:bg-[#2a2a2a]"
                }`}
              >
                <div 
                  className="w-2.5 h-2.5 rounded-full" 
                  style={{ backgroundColor: STRATEGY_COLORS[index % STRATEGY_COLORS.length] }}
                />
                <span className="text-gray-300 truncate max-w-[100px]">{row.name}</span>
                <span className={`font-medium ${row.totalReturnPct > 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {currency.format(row.totalReturn)}
                </span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Strategy table */}
      <Card className="bg-[#1e1e1e] border-[#2a2a2a]">
        <CardHeader>
          <CardTitle className="text-sm text-white">Strategy Table</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto scrollbar-thin scrollbar-dark">
          {strategiesQuery.isLoading ? (
            <div className="h-24 skeleton-shimmer rounded-lg" />
          ) : strategiesQuery.data?.rows?.length ? (
            <table className="min-w-full divide-y divide-[#2a2a2a] text-sm">
              <thead className="bg-[#1a1a1a]">
                <tr>
                  <th 
                    className="cursor-pointer px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-400 hover:text-white transition-colors" 
                    onClick={() => handleSort("name")}
                  >
                    Name {sortBy === "name" && (sortOrder === "asc" ? "↑" : "↓")}
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Type</th>
                  <th 
                    className="cursor-pointer px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-400 hover:text-white transition-colors"
                    onClick={() => handleSort("totalTrades")}
                  >
                    Trades {sortBy === "totalTrades" && (sortOrder === "asc" ? "↑" : "↓")}
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Curve</th>
                  <th 
                    className="cursor-pointer px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-400 hover:text-white transition-colors"
                    onClick={() => handleSort("totalReturnPct")}
                  >
                    Return {sortBy === "totalReturnPct" && (sortOrder === "asc" ? "↑" : "↓")}
                  </th>
                  <th 
                    className="cursor-pointer px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-400 hover:text-white transition-colors"
                    onClick={() => handleSort("sharpeRatio")}
                  >
                    Sharpe {sortBy === "sharpeRatio" && (sortOrder === "asc" ? "↑" : "↓")}
                  </th>
                  <th 
                    className="cursor-pointer px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-400 hover:text-white transition-colors"
                    onClick={() => handleSort("profitFactor")}
                  >
                    PF {sortBy === "profitFactor" && (sortOrder === "asc" ? "↑" : "↓")}
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Win Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2a2a2a]">
                {strategiesQuery.data.rows.map((row, index) => {
                  const sparkline = row.sparkline ?? [];
                  const color = STRATEGY_COLORS[index % STRATEGY_COLORS.length];
                  return (
                    <tr
                      key={row.strategyId}
                      className={`cursor-pointer transition-colors ${
                        selectedStrategyId === row.strategyId 
                          ? "bg-blue-900/20" 
                          : "hover:bg-[#252525]"
                      }`}
                      onClick={() => setSelectedStrategyId(row.strategyId)}
                    >
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                          <span className="font-semibold text-white">{row.name}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-gray-400">{row.type}</td>
                      <td className="px-3 py-2 text-gray-400">{row.totalTrades}</td>
                      <td className="px-3 py-2">
                        {sparkline.length ? (
                          <div className="h-10 w-24">
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart data={sparkline} margin={{ top: 2, right: 2, left: 0, bottom: 2 }}>
                                <Line 
                                  type="monotone" 
                                  dataKey="value" 
                                  stroke={color} 
                                  dot={false} 
                                  strokeWidth={1.5} 
                                />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-500">—</span>
                        )}
                      </td>
                      <td className={`px-3 py-2 font-medium ${row.totalReturnPct > 0 ? "text-emerald-400" : "text-red-400"}`}>
                        {percent.format(row.totalReturnPct)}
                      </td>
                      <td className="px-3 py-2 text-gray-300">{row.sharpeRatio.toFixed(2)}</td>
                      <td className="px-3 py-2 text-gray-300">{row.profitFactor.toFixed(2)}</td>
                      <td className="px-3 py-2 text-gray-300">{percent.format(row.winRatePct / 100)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="rounded-lg border border-dashed border-[#3a3a3a] bg-[#1a1a1a] p-4 text-sm text-gray-400 text-center">
              No strategies found for this workspace/time range.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent trades for selected strategy */}
      {selectedStrategy && (
        <Card className="bg-[#1e1e1e] border-[#2a2a2a]">
          <CardHeader>
            <CardTitle className="text-sm text-white">Recent Trades for {selectedStrategy.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] p-3">
              {selectedTrades.length ? (
                <ul className="divide-y divide-[#2a2a2a]">
                  {selectedTrades.slice(0, 10).map(trade => (
                    <li key={trade.id} className="flex items-center justify-between py-2">
                      <div>
                        <div className="font-medium text-white">{trade.symbol}</div>
                        <p className="text-xs text-gray-500">{trade.entryTime} → {trade.exitTime}</p>
                      </div>
                      <Badge 
                        variant={trade.side === "long" ? "success" : "secondary"}
                        className={trade.side === "long" 
                          ? "bg-emerald-900/30 text-emerald-400 border-emerald-800" 
                          : "bg-red-900/30 text-red-400 border-red-800"
                        }
                      >
                        {trade.side}
                      </Badge>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-400 text-center py-4">
                  No trades mapped to this strategy in the current range.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default StrategiesPage;
