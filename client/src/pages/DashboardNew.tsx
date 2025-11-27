import { useMemo, useState } from "react";
import ChartSkeleton from "../components/ChartSkeleton";
import MetricCard from "../components/MetricCard";
import MonteCarloPanel from "../components/MonteCarloPanel";
import RollingMetrics from "../components/RollingMetrics";
import StrategyComparison from "../components/StrategyComparison";
import TradesTable from "../components/TradesTable";
import { trpc } from "../lib/trpc";
import type { DrawdownPoint, EquityCurvePoint, TradeRow } from "@shared/types/portfolio";

function DashboardNew() {
  const [monteCarloParams, setMonteCarloParams] = useState({ days: 90, simulations: 500 });
  const summaryQuery = trpc.analytics.summary.useQuery(undefined, { retry: 1 });
  const overviewQuery = trpc.portfolio.overview.useQuery(undefined, { retry: 1 });
  const equityQuery = trpc.portfolio.equityCurves.useQuery({ maxPoints: 12 }, { retry: 1 });
  const drawdownQuery = trpc.portfolio.drawdowns.useQuery({ maxPoints: 12 }, { retry: 1 });
  const comparisonQuery = trpc.portfolio.strategyComparison.useQuery({
    page: 1,
    pageSize: 25,
    sortBy: "totalReturn",
    sortOrder: "desc",
    filterType: "all",
  });
  const tradesQuery = trpc.portfolio.trades.useQuery(undefined, { retry: 1 });
  const monteCarloQuery = trpc.portfolio.monteCarloSimulation.useQuery(monteCarloParams, { retry: 1 });

  const currency = useMemo(
    () =>
      new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
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

  const overview = overviewQuery.data;
  const summary = summaryQuery.data;
  const equity = equityQuery.data;
  const drawdowns = drawdownQuery.data;
  const comparison = comparisonQuery.data;
  const trades = tradesQuery.data as TradeRow[] | undefined;
  const monteCarlo = monteCarloQuery.data;

  const renderError = (message: string, retry?: () => void) => (
    <div className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
      <div className="flex items-center justify-between">
        <span>{message}</span>
        {retry ? (
          <button className="text-xs font-semibold underline" onClick={retry} type="button">
            Retry
          </button>
        ) : null}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <RollingMetrics summary={summary} isLoading={summaryQuery.isLoading} />

      {overviewQuery.isError && renderError("Unable to load overview.", overviewQuery.refetch)}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard
          label="Equity"
          value={overview ? currency.format(overview.equity) : currency.format(0)}
          isLoading={overviewQuery.isLoading}
        />
        <MetricCard
          label="Daily P&L"
          value={overview ? currency.format(overview.dailyPnL) : currency.format(0)}
          isLoading={overviewQuery.isLoading}
        />
        <MetricCard
          label="Daily Return"
          value={percent.format((overview?.dailyReturn ?? 0))}
          isLoading={overviewQuery.isLoading}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ChartSkeleton title="Aggregated equity curve">
          {equityQuery.isLoading ? (
            <div className="h-32 animate-pulse rounded bg-slate-100" />
          ) : equity?.points?.length ? (
            <ul className="space-y-1 text-xs">
              {equity.points.map((point: EquityCurvePoint) => (
                <li key={point.date} className="flex justify-between">
                  <span className="text-slate-500">{point.date}</span>
                  <span className="text-slate-800 font-medium">
                    {currency.format(point.combined)} / {currency.format(point.swing)} / {currency.format(point.intraday)} /
                    {currency.format(point.spx)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-sm text-slate-500">No equity history yet.</div>
          )}
        </ChartSkeleton>
        <ChartSkeleton title="Drawdown profile">
          {drawdownQuery.isLoading ? (
            <div className="h-32 animate-pulse rounded bg-slate-100" />
          ) : drawdowns?.points?.length ? (
            <ul className="space-y-1 text-xs">
              {drawdowns.points.map((point: DrawdownPoint) => (
                <li key={point.date} className="flex justify-between">
                  <span className="text-slate-500">{point.date}</span>
                  <span className="text-rose-600 font-medium">
                    {percent.format(point.combined / (overview?.equity || 1))} / {percent.format(point.swing / (overview?.equity || 1))} /
                    {percent.format(point.intraday / (overview?.equity || 1))}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-sm text-slate-500">No drawdown events recorded yet.</div>
          )}
        </ChartSkeleton>
      </div>

      <MonteCarloPanel
        result={monteCarlo}
        days={monteCarloParams.days}
        simulations={monteCarloParams.simulations}
        isLoading={monteCarloQuery.isLoading}
        onRerun={params => setMonteCarloParams(params)}
      />

      {comparisonQuery.isError && renderError("Strategy comparison failed to load.", comparisonQuery.refetch)}
      <StrategyComparison rows={comparison?.rows ?? []} isLoading={comparisonQuery.isLoading} />
      <TradesTable trades={trades ?? []} isLoading={tradesQuery.isLoading} />
    </div>
  );
}

export default DashboardNew;
