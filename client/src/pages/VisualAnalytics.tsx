import { useMemo, useState } from "react";

import CorrelationHeatmap from "../components/CorrelationHeatmap";
import EquityChart from "../components/EquityChart";
import MetricCard from "../components/MetricCard";
import MonteCarloPanel from "../components/MonteCarloPanel";
import StrategyMultiSelect from "../components/StrategyMultiSelect";
import TimeRangeSelector, { TimeRangeSelectorPreset } from "../components/TimeRangeSelector";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { DistributionSnapshot } from "../components/visuals/DistributionSnapshot";
import { CalendarPnL } from "../components/visuals/CalendarPnL";
import { DayOfWeekHeatmap } from "../components/visuals/DayOfWeekHeatmap";
import { MonthlyReturnsCalendar } from "../components/visuals/MonthlyReturnsCalendar";
import { WeekOfMonthHeatmap } from "../components/visuals/WeekOfMonthHeatmap";
import { trpc } from "../lib/trpc";
import StartingCapitalInput from "../components/StartingCapitalInput";
import type { StrategySummary, TimeRange } from "@shared/types/portfolio";

const PRESETS: TimeRangeSelectorPreset[] = ["YTD", "1Y", "3Y", "5Y", "ALL"];
const LIST_TIME_RANGE: TimeRange = { preset: "ALL" };
const DEFAULT_START = 100000;

type ContractRange = "YTD" | "1Y" | "3Y" | "5Y" | "ALL";

interface EquityPoint {
  date: string;
  equity: number;
  benchmark?: number;
  pnl: number;
  returnPct: number;
}

function buildEquitySeries(points: Array<{ date: string; combined: number; spx?: number }>, startingCapital: number) {
  const sorted = [...points].sort((a, b) => a.date.localeCompare(b.date));
  let prevEquity = startingCapital;
  return sorted.map(point => {
    const equity = startingCapital + Number(point.combined ?? 0);
    const pnl = equity - prevEquity;
    const returnPct = prevEquity ? (pnl / prevEquity) * 100 : 0;
    prevEquity = equity;
    return {
      date: point.date,
      equity,
      benchmark: startingCapital + Number(point.spx ?? 0),
      pnl,
      returnPct,
    } satisfies EquityPoint;
  });
}

function VisualAnalyticsPage() {
  const [timeRange, setTimeRange] = useState<ContractRange>("1Y");
  const [startingCapital, setStartingCapital] = useState<number>(DEFAULT_START);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [mcDays, setMcDays] = useState(90);
  const [mcSimulations, setMcSimulations] = useState(500);
  const [activeTab, setActiveTab] = useState<"dayOfWeek" | "weekOfMonth">("dayOfWeek");

  const analyticsQuery = trpc.portfolio.getAnalytics.useQuery(
    { timeRange: { preset: timeRange }, maxPoints: 720 },
    { retry: 1 },
  );
  const strategiesQuery = trpc.portfolio.strategyComparison.useQuery(
    { page: 1, pageSize: 50, sortBy: "name", sortOrder: "asc", filterType: "all", timeRange: LIST_TIME_RANGE },
    { retry: 1 },
  );
  const compareQuery = trpc.portfolio.compareStrategies.useQuery(
    { strategyIds: selectedIds, timeRange, startingCapital },
    { enabled: selectedIds.length >= 2 && selectedIds.length <= 4, retry: 1 },
  );
  const monteCarloQuery = trpc.portfolio.monteCarloSimulation.useQuery(
    { days: mcDays, simulations: mcSimulations, timeRange: { preset: timeRange } },
    { retry: 1 },
  );

  const equitySeries = useMemo(
    () => buildEquitySeries(analyticsQuery.data?.equityCurve ?? [], startingCapital),
    [analyticsQuery.data?.equityCurve, startingCapital],
  );

  const dailyReturns = useMemo(() => equitySeries.map(point => ({
    date: point.date,
    pnl: point.pnl,
    returnPct: point.returnPct,
    equity: point.equity,
  })), [equitySeries]);

  const dailyReturnPct = useMemo(() => dailyReturns.map(item => item.returnPct), [dailyReturns]);

  const strategyOptions: StrategySummary[] = useMemo(
    () => strategiesQuery.data?.rows?.map(row => ({ id: row.strategyId, name: row.name, type: row.type })) ?? [],
    [strategiesQuery.data?.rows],
  );

  const correlationData = compareQuery.data?.correlationMatrix;
  const correlationSeries = correlationData?.matrix ?? [];

  const metrics = analyticsQuery.data?.metrics;

  const breakdownMessage = selectedIds.length < 2 || selectedIds.length > 4 ? "Select 2-4 strategies to view correlation." : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-lg font-semibold text-white">Visual Analytics</h1>
          <p className="text-sm text-gray-400">Heatmaps, calendars, and simulations backed by live data.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <TimeRangeSelector value={timeRange} onChange={preset => setTimeRange(preset as ContractRange)} presets={PRESETS} />
          <StartingCapitalInput value={startingCapital} onChange={setStartingCapital} />
        </div>
      </div>

      {/* Error state */}
      {analyticsQuery.isError && (
        <div className="rounded-lg border border-red-800/50 bg-red-900/20 px-4 py-3 text-sm text-red-400">
          Unable to load analytics. Please check the API connection.
        </div>
      )}

      {/* Equity Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Portfolio Equity vs Benchmark</CardTitle>
          <p className="text-xs text-gray-500">Performance comparison over time</p>
        </CardHeader>
        <CardContent>
          <EquityChart
            data={equitySeries.map(point => ({ date: point.date, equity: point.equity, benchmark: point.benchmark }))}
            series={[
              { key: "equity", name: "Portfolio", color: "#3b82f6" },
              { key: "benchmark", name: "S&P 500", color: "#6b7280" },
            ]}
            isLoading={analyticsQuery.isLoading}
            dataTestId="visual-equity"
            height={360}
          />
        </CardContent>
      </Card>

      {/* Distribution and Calendar Grid */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm">Return Distribution</CardTitle>
            <p className="text-xs text-gray-500">Daily return frequency histogram</p>
          </CardHeader>
          <CardContent>
            <DistributionSnapshot returnsPct={dailyReturnPct} isLoading={analyticsQuery.isLoading} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Recent P&L Calendar</CardTitle>
          </CardHeader>
          <CardContent>
            <CalendarPnL records={dailyReturns} isLoading={analyticsQuery.isLoading} />
          </CardContent>
        </Card>
      </div>

      {/* Day/Week Performance Card with Tabs */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-sm">Day-of-Week Performance</CardTitle>
              <p className="text-xs text-gray-500">Average P&L and win rate by trading day</p>
            </div>
            <div className="flex gap-1 p-1 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a]">
              <button
                onClick={() => setActiveTab("dayOfWeek")}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  activeTab === "dayOfWeek" 
                    ? "bg-blue-600 text-white" 
                    : "text-gray-400 hover:text-white hover:bg-[#252525]"
                }`}
              >
                Day of Week
              </button>
              <button
                onClick={() => setActiveTab("weekOfMonth")}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  activeTab === "weekOfMonth" 
                    ? "bg-blue-600 text-white" 
                    : "text-gray-400 hover:text-white hover:bg-[#252525]"
                }`}
              >
                Week of Month
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {activeTab === "dayOfWeek" ? (
            <DayOfWeekHeatmap records={dailyReturns} isLoading={analyticsQuery.isLoading} />
          ) : (
            <WeekOfMonthHeatmap records={dailyReturns} isLoading={analyticsQuery.isLoading} />
          )}
        </CardContent>
      </Card>

      {/* Monthly Returns Calendar */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Monthly Returns Calendar</CardTitle>
          <p className="text-xs text-gray-500">Monthly performance overview</p>
        </CardHeader>
        <CardContent>
          <MonthlyReturnsCalendar
            records={dailyReturns.map(item => ({ date: item.date, equity: item.equity }))}
            isLoading={analyticsQuery.isLoading}
          />
        </CardContent>
      </Card>

      {/* Strategy Correlation */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle className="text-sm">Strategy Correlation Matrix</CardTitle>
              <p className="text-xs text-gray-500">Select 2-4 strategies to render the matrix</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <StrategyMultiSelect
            options={strategyOptions}
            selected={selectedIds}
            onChange={setSelectedIds}
            disabled={strategiesQuery.isLoading}
          />

          {compareQuery.isLoading ? (
            <div className="h-24 skeleton-shimmer rounded-lg" />
          ) : correlationSeries.length === 0 ? (
            <div className="rounded-lg border border-dashed border-[#3a3a3a] bg-[#1a1a1a] px-4 py-6 text-sm text-gray-400 text-center">
              {breakdownMessage ?? "Select strategies to refresh the correlation matrix."}
            </div>
          ) : (
            <CorrelationHeatmap
              strategyIds={correlationData?.strategyIds ?? selectedIds}
              matrix={correlationSeries}
            />
          )}
        </CardContent>
      </Card>

      {/* Key Metrics Grid */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Key Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          {analyticsQuery.isLoading ? (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="h-20 skeleton-shimmer rounded-xl" />
              ))}
            </div>
          ) : metrics ? (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <MetricCard 
                label="Total Return" 
                value={`${metrics.totalReturnPct >= 0 ? "+" : ""}${metrics.totalReturnPct.toFixed(2)}%`}
                variant={metrics.totalReturnPct >= 0 ? "success" : "danger"}
              />
              <MetricCard 
                label="Sharpe Ratio" 
                value={metrics.sharpe.toFixed(2)}
                helper={metrics.sharpe >= 1 ? "Good" : metrics.sharpe >= 0.5 ? "Moderate" : "Low"}
              />
              <MetricCard 
                label="Sortino Ratio" 
                value={metrics.sortino.toFixed(2)}
              />
              <MetricCard 
                label="Max Drawdown" 
                value={`${metrics.maxDrawdownPct.toFixed(2)}%`}
                variant="danger"
              />
              <MetricCard 
                label="Volatility" 
                value={`${metrics.volatilityPct.toFixed(2)}%`}
              />
              <MetricCard 
                label="Win Rate" 
                value={`${metrics.winRatePct.toFixed(1)}%`}
                variant={metrics.winRatePct >= 50 ? "success" : "warning"}
              />
              <MetricCard 
                label="Profit Factor" 
                value={metrics.profitFactor.toFixed(2)}
                variant={metrics.profitFactor >= 1.5 ? "success" : metrics.profitFactor >= 1 ? "warning" : "danger"}
              />
              <MetricCard 
                label="Total Trades" 
                value={analyticsQuery.data?.tradeCount.toLocaleString() ?? "0"}
              />
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-4">Metrics will appear when analytics are available.</p>
          )}
        </CardContent>
      </Card>

      {/* Monte Carlo Simulation */}
      <MonteCarloPanel
        result={monteCarloQuery.data}
        days={mcDays}
        simulations={mcSimulations}
        isLoading={monteCarloQuery.isLoading}
        onRerun={({ days, simulations }) => {
          setMcDays(days);
          setMcSimulations(simulations);
        }}
      />
    </div>
  );
}

export default VisualAnalyticsPage;
