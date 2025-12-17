import { useMemo, useState } from "react";

import CorrelationHeatmap from "../components/CorrelationHeatmap";
import DrawdownChart from "../components/DrawdownChart";
import EquityChart from "../components/EquityChart";
import MetricsGrid from "../components/MetricsGrid";
import StartingCapitalInput from "../components/StartingCapitalInput";
import StrategyComparison from "../components/StrategyComparison";
import TimeRangeSelector, { TimeRangeSelectorPreset } from "../components/TimeRangeSelector";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { trpc } from "../lib/trpc";

const percent = (value: number) => `${value.toFixed(2)}%`;
const currency = new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });

type ContractRange = "YTD" | "1Y" | "3Y" | "5Y" | "ALL";

const OVERVIEW_PRESETS: TimeRangeSelectorPreset[] = ["YTD", "1Y", "3Y", "5Y", "ALL"];

function OverviewPage() {
  const [timeRange, setTimeRange] = useState<ContractRange>("1Y");
  const [startingCapital, setStartingCapital] = useState<number>(100000);

  const overviewQuery = trpc.portfolio.overview.useQuery(
    { timeRange, startingCapital },
    { retry: 1 },
  );

  const overview = overviewQuery.data;
  const equityData = useMemo(
    () =>
      overview?.equityCurve?.map(point => ({
        date: point.date,
        portfolio: point.portfolio,
        spy: point.spy,
      })) ?? [],
    [overview?.equityCurve],
  );

  const drawdownData = useMemo(
    () =>
      overview?.drawdownCurve?.map(point => ({
        date: point.date,
        portfolio: point.portfolio,
        spy: point.spy,
      })) ?? [],
    [overview?.drawdownCurve],
  );

  const metricsRows = useMemo(() => {
    if (!overview?.metrics) return [];
    const { portfolio, spy } = overview.metrics;
    return [
      { label: "Total Return", portfolio: portfolio.totalReturn, benchmark: spy.totalReturn, formatter: percent },
      { label: "Annualized Return", portfolio: portfolio.annualizedReturn, benchmark: spy.annualizedReturn, formatter: percent },
      { label: "Volatility", portfolio: portfolio.volatility, benchmark: spy.volatility, formatter: percent },
      { label: "Sharpe Ratio", portfolio: portfolio.sharpe, benchmark: spy.sharpe, formatter: (v: number) => v.toFixed(2) },
      { label: "Sortino Ratio", portfolio: portfolio.sortino, benchmark: spy.sortino, formatter: (v: number) => v.toFixed(2) },
      { label: "Calmar Ratio", portfolio: portfolio.calmar, benchmark: spy.calmar, formatter: (v: number) => v.toFixed(2) },
      { label: "Max Drawdown", portfolio: portfolio.maxDrawdown, benchmark: spy.maxDrawdown, formatter: percent },
      { label: "Win Rate", portfolio: portfolio.winRate, benchmark: spy.winRate, formatter: percent },
      { label: "Profit Factor", portfolio: portfolio.profitFactor, benchmark: spy.profitFactor, formatter: (v: number) => v.toFixed(2) },
      { label: "Total Trades", portfolio: portfolio.totalTrades, benchmark: spy.totalTrades, formatter: (v: number) => v.toFixed(0) },
      { label: "Avg Win", portfolio: portfolio.avgWin, benchmark: spy.avgWin, formatter: currency.format },
      { label: "Avg Loss", portfolio: portfolio.avgLoss, benchmark: spy.avgLoss, formatter: currency.format },
    ];
  }, [overview?.metrics]);

  const breakdownRows = useMemo(
    () =>
      overview?.breakdown
        ? [
            { label: "Daily", portfolio: overview.breakdown.daily.portfolio, spy: overview.breakdown.daily.spy },
            { label: "Weekly", portfolio: overview.breakdown.weekly.portfolio, spy: overview.breakdown.weekly.spy },
            { label: "Monthly", portfolio: overview.breakdown.monthly.portfolio, spy: overview.breakdown.monthly.spy },
            { label: "Quarterly", portfolio: overview.breakdown.quarterly.portfolio, spy: overview.breakdown.quarterly.spy },
            { label: "Year to Date", portfolio: overview.breakdown.ytd.portfolio, spy: overview.breakdown.ytd.spy },
          ]
        : [],
    [overview?.breakdown],
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-lg font-semibold text-white">Portfolio Overview</h1>
          <p className="text-sm text-gray-400">Equity, drawdowns, and key stats versus S&P 500 benchmark.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <TimeRangeSelector value={timeRange} onChange={preset => setTimeRange(preset as ContractRange)} presets={OVERVIEW_PRESETS} />
          <StartingCapitalInput value={startingCapital} onChange={setStartingCapital} />
        </div>
      </div>

      {/* Error state */}
      {overviewQuery.isError && (
        <div className="rounded-lg border border-red-800/50 bg-red-900/20 px-4 py-3 text-sm text-red-400">
          Failed to load overview. Please try again.
        </div>
      )}

      {/* Equity Curve Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Equity Curve</CardTitle>
          <p className="text-xs text-gray-500">Portfolio performance vs S&P 500 benchmark</p>
        </CardHeader>
        <CardContent>
          <EquityChart
            data={equityData}
            series={[
              { key: "portfolio", name: "Portfolio", color: "#3b82f6" },
              { key: "spy", name: "S&P 500", color: "#6b7280" },
            ]}
            isLoading={overviewQuery.isLoading}
            dataTestId="equity-chart"
            height={360}
          />
        </CardContent>
      </Card>

      {/* Drawdown and Breakdown Grid */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Underwater Equity Curve */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm">Underwater Equity Curve</CardTitle>
            <p className="text-xs text-gray-500">Drawdown from peak over time</p>
          </CardHeader>
          <CardContent>
            <DrawdownChart
              data={drawdownData}
              series={[
                { key: "portfolio", name: "Portfolio", color: "#ef4444" },
                { key: "spy", name: "S&P 500", color: "#6b7280" },
              ]}
              isLoading={overviewQuery.isLoading}
              valueFormatter={value => `${value.toFixed(2)}%`}
              height={280}
            />
          </CardContent>
        </Card>

        {/* Performance Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Performance Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {overviewQuery.isLoading ? (
              <div className="h-24 skeleton-shimmer rounded-lg" />
            ) : breakdownRows.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">No breakdown data for this window.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-[#1a1a1a] text-left text-gray-400">
                    <tr>
                      <th className="px-3 py-2 font-semibold rounded-tl-lg">Period</th>
                      <th className="px-3 py-2 text-right font-semibold">Portfolio</th>
                      <th className="px-3 py-2 text-right font-semibold rounded-tr-lg">S&P 500</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2a2a2a]">
                    {breakdownRows.map(row => (
                      <tr key={row.label} className="hover:bg-[#252525] transition-colors">
                        <td className="px-3 py-2 font-medium text-gray-300">{row.label}</td>
                        <td className={`px-3 py-2 text-right font-medium ${
                          row.portfolio > 0 ? "text-emerald-400" : "text-red-400"
                        }`}>
                          {percent(row.portfolio)}
                        </td>
                        <td className={`px-3 py-2 text-right ${
                          row.spy > 0 ? "text-gray-300" : "text-red-400"
                        }`}>
                          {percent(row.spy)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Key Metrics */}
      <MetricsGrid rows={metricsRows} isLoading={overviewQuery.isLoading} title="Key Metrics" />

      {/* Correlation Matrix */}
      {overview?.correlationMatrix && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Portfolio Correlation Snapshot</CardTitle>
            <p className="text-xs text-gray-500">Strategy correlation matrix</p>
          </CardHeader>
          <CardContent>
            <CorrelationHeatmap
              strategyIds={overview.correlationMatrix.strategyIds}
              matrix={overview.correlationMatrix.matrix}
            />
          </CardContent>
        </Card>
      )}

      {/* Top Strategies */}
      {overview?.topStrategies && (
        <StrategyComparison rows={overview.topStrategies} isLoading={overviewQuery.isLoading} />
      )}
    </div>
  );
}

export default OverviewPage;
