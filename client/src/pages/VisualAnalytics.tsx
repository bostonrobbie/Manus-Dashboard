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
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Visual analytics</h1>
          <p className="text-sm text-slate-600">Heatmaps, calendars, and simulations backed by live tRPC data.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <TimeRangeSelector value={timeRange} onChange={preset => setTimeRange(preset as ContractRange)} presets={PRESETS} />
          <StartingCapitalInput value={startingCapital} onChange={setStartingCapital} />
        </div>
      </div>

      {analyticsQuery.isError ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Unable to load analytics. Please check the API connection.
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Portfolio equity vs benchmark</CardTitle>
        </CardHeader>
        <CardContent>
          <EquityChart
            data={equitySeries.map(point => ({ date: point.date, equity: point.equity, benchmark: point.benchmark }))}
            series={[
              { key: "equity", name: "Equity", color: "#0f172a" },
              { key: "benchmark", name: "Benchmark", color: "#2563eb" },
            ]}
            isLoading={analyticsQuery.isLoading}
            dataTestId="visual-equity"
          />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm">Return distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <DistributionSnapshot returnsPct={dailyReturnPct} isLoading={analyticsQuery.isLoading} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Recent PnL calendar</CardTitle>
          </CardHeader>
          <CardContent>
            <CalendarPnL records={dailyReturns} isLoading={analyticsQuery.isLoading} />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Day of week heatmap</CardTitle>
          </CardHeader>
          <CardContent>
            <DayOfWeekHeatmap records={dailyReturns} isLoading={analyticsQuery.isLoading} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Week of month heatmap</CardTitle>
          </CardHeader>
          <CardContent>
            <WeekOfMonthHeatmap records={dailyReturns} isLoading={analyticsQuery.isLoading} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Monthly return calendar</CardTitle>
          </CardHeader>
          <CardContent>
            <MonthlyReturnsCalendar
              records={dailyReturns.map(item => ({ date: item.date, equity: item.equity }))}
              isLoading={analyticsQuery.isLoading}
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <CardTitle className="text-sm">Strategy correlation (live)</CardTitle>
            <div className="text-xs text-slate-600">Select 2-4 strategies to render the matrix.</div>
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
            <div className="h-24 animate-pulse rounded-md bg-slate-100" />
          ) : correlationSeries.length === 0 ? (
            <div className="rounded-md border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
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

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Key metrics</CardTitle>
        </CardHeader>
        <CardContent>
          {analyticsQuery.isLoading ? (
            <div className="h-24 animate-pulse rounded-md bg-slate-100" />
          ) : metrics ? (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <MetricCard label="Total return" value={`${metrics.totalReturnPct.toFixed(2)}%`} />
              <MetricCard label="Sharpe" value={metrics.sharpe.toFixed(2)} />
              <MetricCard label="Sortino" value={metrics.sortino.toFixed(2)} />
              <MetricCard label="Max drawdown" value={`${metrics.maxDrawdownPct.toFixed(2)}%`} />
              <MetricCard label="Volatility" value={`${metrics.volatilityPct.toFixed(2)}%`} />
              <MetricCard label="Win rate" value={`${metrics.winRatePct.toFixed(2)}%`} />
              <MetricCard label="Profit factor" value={metrics.profitFactor.toFixed(2)} />
              <MetricCard label="Trades" value={analyticsQuery.data?.tradeCount.toString() ?? "0"} />
            </div>
          ) : (
            <p className="text-sm text-slate-600">Metrics will appear when analytics are available.</p>
          )}
        </CardContent>
      </Card>

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
