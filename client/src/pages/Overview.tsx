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
  const [timeRange, setTimeRange] = useState<ContractRange>("YTD");
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
      { label: "Total return", portfolio: portfolio.totalReturn, benchmark: spy.totalReturn, formatter: percent },
      { label: "Annualized return", portfolio: portfolio.annualizedReturn, benchmark: spy.annualizedReturn, formatter: percent },
      { label: "Volatility", portfolio: portfolio.volatility, benchmark: spy.volatility, formatter: percent },
      { label: "Sharpe", portfolio: portfolio.sharpe, benchmark: spy.sharpe, formatter: v => v.toFixed(2) },
      { label: "Sortino", portfolio: portfolio.sortino, benchmark: spy.sortino, formatter: v => v.toFixed(2) },
      { label: "Calmar", portfolio: portfolio.calmar, benchmark: spy.calmar, formatter: v => v.toFixed(2) },
      { label: "Max drawdown", portfolio: portfolio.maxDrawdown, benchmark: spy.maxDrawdown, formatter: percent },
      { label: "Win rate", portfolio: portfolio.winRate, benchmark: spy.winRate, formatter: percent },
      { label: "Profit factor", portfolio: portfolio.profitFactor, benchmark: spy.profitFactor, formatter: v => v.toFixed(2) },
      { label: "Total trades", portfolio: portfolio.totalTrades, benchmark: spy.totalTrades, formatter: v => v.toFixed(0) },
      { label: "Avg win", portfolio: portfolio.avgWin, benchmark: spy.avgWin, formatter: currency.format },
      { label: "Avg loss", portfolio: portfolio.avgLoss, benchmark: spy.avgLoss, formatter: currency.format },
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
            { label: "Year to date", portfolio: overview.breakdown.ytd.portfolio, spy: overview.breakdown.ytd.spy },
          ]
        : [],
    [overview?.breakdown],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Portfolio overview</h1>
          <p className="text-sm text-slate-600">Equity, drawdowns, and key stats versus SPY for the selected horizon.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <TimeRangeSelector value={timeRange} onChange={preset => setTimeRange(preset as ContractRange)} presets={OVERVIEW_PRESETS} />
          <StartingCapitalInput value={startingCapital} onChange={setStartingCapital} />
        </div>
      </div>

      {overviewQuery.isError ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Failed to load overview. Please try again.
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Equity curves</CardTitle>
        </CardHeader>
        <CardContent>
          <EquityChart
            data={equityData}
            series={[
              { key: "portfolio", name: "Portfolio", color: "#0f172a" },
              { key: "spy", name: "SPY", color: "#1d4ed8" },
            ]}
            isLoading={overviewQuery.isLoading}
            dataTestId="equity-chart"
          />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm">Drawdown comparison</CardTitle>
          </CardHeader>
          <CardContent>
            <DrawdownChart
              data={drawdownData}
              series={[
                { key: "portfolio", name: "Portfolio", color: "#f97316" },
                { key: "spy", name: "SPY", color: "#22c55e" },
              ]}
              isLoading={overviewQuery.isLoading}
              valueFormatter={value => `${value.toFixed(2)}%`}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Performance breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {overviewQuery.isLoading ? (
              <div className="h-24 animate-pulse rounded bg-slate-100" />
            ) : breakdownRows.length === 0 ? (
              <p className="text-sm text-slate-600">No breakdown data for this window.</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-slate-600">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Period</th>
                    <th className="px-3 py-2 text-right font-semibold">Portfolio</th>
                    <th className="px-3 py-2 text-right font-semibold">SPY</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {breakdownRows.map(row => (
                    <tr key={row.label}>
                      <td className="px-3 py-2 font-medium text-slate-800">{row.label}</td>
                      <td className="px-3 py-2 text-right">{percent(row.portfolio)}</td>
                      <td className="px-3 py-2 text-right">{percent(row.spy)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>

      <MetricsGrid rows={metricsRows} isLoading={overviewQuery.isLoading} title="Key metrics" />

      {overview?.correlationMatrix ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Portfolio correlation snapshot</CardTitle>
          </CardHeader>
          <CardContent>
            <CorrelationHeatmap
              strategyIds={overview.correlationMatrix.strategyIds}
              matrix={overview.correlationMatrix.matrix}
            />
          </CardContent>
        </Card>
      ) : null}

      {overview?.topStrategies ? (
        <StrategyComparison rows={overview.topStrategies} isLoading={overviewQuery.isLoading} />
      ) : null}
    </div>
  );
}

export default OverviewPage;
