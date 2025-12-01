import { useEffect, useMemo } from "react";
import type { JSX } from "react";

import { PortfolioEquityChart } from "../components/dashboard/PortfolioEquityChart";
import { StatsPanel } from "../components/dashboard/StatsPanel";
import { StrategyEquityGrid } from "../components/dashboard/StrategyEquityGrid";
import { StrategyStatsTable } from "../components/dashboard/StrategyStatsTable";
import MetricCard from "../components/MetricCard";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { dashboardSections } from "../config/dashboardLayoutConfig";
import { logClientError } from "../lib/clientLogger";
import { trpc } from "../lib/trpc";
import { useDashboardState } from "../providers/DashboardProvider";
import { useCurrentUser } from "../hooks/useCurrentUser";

const componentMap: Record<string, (args: any) => JSX.Element> = {
  portfolioSummary: ({ overviewMetrics }: any) => {
    const percent = new Intl.NumberFormat(undefined, {
      style: "percent",
      minimumFractionDigits: 1,
      maximumFractionDigits: 2,
    });

    const currency = new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });

    return (
      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <MetricCard
          label="Total return"
          value={
            overviewMetrics?.totalReturnPct != null
              ? percent.format(overviewMetrics.totalReturnPct / 100)
              : undefined
          }
          helper={overviewMetrics?.accountValue != null ? currency.format(overviewMetrics.accountValue) : undefined}
          isLoading={!overviewMetrics}
        />
        <MetricCard
          label="Max drawdown"
          value={
            overviewMetrics?.maxDrawdownPct != null
              ? percent.format(overviewMetrics.maxDrawdownPct / 100)
              : undefined
          }
          helper={
            overviewMetrics?.maxDrawdownValue != null
              ? currency.format(Math.abs(overviewMetrics.maxDrawdownValue))
              : undefined
          }
          isLoading={!overviewMetrics}
        />
        <MetricCard
          label="Today P&L"
          value={overviewMetrics ? currency.format(overviewMetrics.todayPnl ?? 0) : undefined}
          helper={overviewMetrics ? `YTD ${currency.format(overviewMetrics.ytdPnl ?? 0)}` : undefined}
          isLoading={!overviewMetrics}
        />
        <MetricCard
          label="MTD P&L"
          value={overviewMetrics ? currency.format(overviewMetrics.mtdPnl ?? 0) : undefined}
          helper={
            overviewMetrics?.dataHealth?.lastTradeDate
              ? `Last trade ${overviewMetrics.dataHealth.lastTradeDate}`
              : overviewMetrics?.dataHealth?.firstTradeDate
                ? `First trade ${overviewMetrics.dataHealth.firstTradeDate}`
                : undefined
          }
          isLoading={!overviewMetrics}
        />
      </div>
    );
  },
  portfolioEquity: ({ equitySeries, statsSummary, hasTrades }: any) => (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Portfolio equity</CardTitle>
      </CardHeader>
      <CardContent>
        {hasTrades ? (
          <PortfolioEquityChart
            equitySeries={equitySeries}
            stats={{
              sharpe: statsSummary?.sharpe,
              maxDrawdownPct: statsSummary?.maxDrawdownPct,
              winRatePct: statsSummary?.winRatePct,
              tradeCount: statsSummary?.tradeCount,
            }}
          />
        ) : (
          <div className="flex h-48 items-center justify-center text-sm text-slate-500">
            No trades yet. Upload your first CSV to see equity curves.
          </div>
        )}
      </CardContent>
    </Card>
  ),
  strategyTable: ({ strategies }: any) => <StrategyStatsTable strategies={strategies} />,
  strategyEquityGrid: ({ strategies }: any) => <StrategyEquityGrid strategies={strategies} />,
  alerts: ({ statsSummary, overviewMetrics, hasTrades }: any) => (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Attention</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 text-sm text-slate-700">
          <div className="rounded-md bg-amber-50 px-3 py-2 text-amber-800">
            Max drawdown: {overviewMetrics?.maxDrawdownPct?.toFixed(2) ?? "0"}%
          </div>
          <StatsPanel
            title="Snapshot"
            sharpe={statsSummary?.sharpe}
            maxDrawdown={statsSummary?.maxDrawdownPct}
            winRate={statsSummary?.winRatePct}
            tradeCount={statsSummary?.tradeCount}
          />
          {!hasTrades ? (
            <div className="text-xs text-slate-500">No trades available for this range.</div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  ),
};

export default function HomeDashboardPage() {
  const { timeRange } = useDashboardState();
  const { user } = useCurrentUser();

  const overviewQuery = trpc.portfolio.getOverview.useQuery({ timeRange }, { retry: 1 });
  const strategyQuery = trpc.portfolio.getStrategySummaries.useQuery({ timeRange }, { retry: 1 });

  useEffect(() => {
    if (overviewQuery.error) {
      logClientError("HomeDashboard.getOverview", overviewQuery.error, { timeRange });
    }
  }, [overviewQuery.error, timeRange]);

  useEffect(() => {
    if (strategyQuery.error) {
      logClientError("HomeDashboard.getStrategySummaries", strategyQuery.error, { timeRange });
    }
  }, [strategyQuery.error, timeRange]);

  const equitySeries = useMemo(() => {
    return overviewQuery.data?.portfolioEquity?.map(point => ({ date: point.date, value: point.equity })) ?? [];
  }, [overviewQuery.data?.portfolioEquity]);

  const overviewMetrics = useMemo(() => {
    if (!overviewQuery.data) return null;

    const accountValue = overviewQuery.data.accountValue ?? null;
    const totalReturnPct = accountValue != null ? ((accountValue - 10000) / 10000) * 100 : undefined;
    const maxDrawdownPct =
      accountValue && accountValue !== 0
        ? Math.abs(((overviewQuery.data.maxDrawdown ?? 0) / accountValue) * 100)
        : undefined;

    return {
      accountValue,
      totalReturnPct,
      maxDrawdownPct,
      maxDrawdownValue: overviewQuery.data.maxDrawdown,
      todayPnl: overviewQuery.data.todayPnl ?? 0,
      mtdPnl: overviewQuery.data.mtdPnl ?? 0,
      ytdPnl: overviewQuery.data.ytdPnl ?? 0,
      dataHealth: overviewQuery.data.dataHealth,
    };
  }, [overviewQuery.data]);

  const strategies = useMemo(
    () =>
      (strategyQuery.data ?? []).map(row => ({
        strategyId: Number(row.strategyId),
        name: row.name,
        instrument: row.instrument ?? undefined,
        sharpe: row.stats.sharpe ?? undefined,
        maxDrawdownPct: Math.abs((row.stats.maxDrawdown / 10000) * 100) || 0,
        winRatePct: row.stats.winRate ?? undefined,
        totalTrades: row.stats.tradeCount,
        equityCurve: row.equityCurve.map(p => ({ value: p.equity, date: p.date })),
      })),
    [strategyQuery.data],
  );

  const summaryStats = useMemo(() => {
    const sharpeValues = strategies
      .map(strategy => strategy.sharpe)
      .filter((value): value is number => value != null && Number.isFinite(value));
    const winRates = strategies
      .map(strategy => strategy.winRatePct)
      .filter((value): value is number => value != null && Number.isFinite(value));

    const sharpe = sharpeValues.length ? sharpeValues.reduce((sum, value) => sum + value, 0) / sharpeValues.length : undefined;
    const winRatePct = winRates.length ? winRates.reduce((sum, value) => sum + value, 0) / winRates.length : undefined;
    const tradeCount = strategies.reduce((sum, strategy) => sum + (strategy.totalTrades ?? 0), 0);

    return { sharpe, winRatePct, tradeCount, maxDrawdownPct: overviewMetrics?.maxDrawdownPct };
  }, [strategies, overviewMetrics?.maxDrawdownPct]);

  const sections = dashboardSections
    .filter(section => section.visibleByDefault)
    .sort((a, b) => a.defaultOrder - b.defaultOrder);
  const hasTrades = overviewQuery.data?.dataHealth?.hasTrades ?? false;
  const userIndicator = user ? (
    <div className="text-right text-xs text-slate-500">
      <div className="font-medium text-slate-700">{user.email}</div>
      <div className="uppercase tracking-wide text-[11px]">{user.role}</div>
    </div>
  ) : null;

  if (overviewQuery.error || strategyQuery.error) {
    const error = overviewQuery.error ?? strategyQuery.error;
    const message = (error as { message?: string } | null)?.message ?? "Unexpected error";

    return (
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Home dashboard</h2>
            <p className="text-sm text-slate-600">We hit an error loading your workspace data. Retry below.</p>
          </div>
          {userIndicator}
        </div>
        <Card>
          <CardContent className="space-y-3 py-6">
            <div className="rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-800">{message}</div>
            <button
              type="button"
              className="inline-flex items-center rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
              onClick={() => {
                overviewQuery.refetch();
                strategyQuery.refetch();
              }}
            >
              Retry loading dashboard
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Home dashboard</h2>
          <p className="text-sm text-slate-600">Portfolio overview, strategy stats, and quick alerts for your workspace.</p>
        </div>
        {userIndicator}
      </div>

      {!overviewQuery.isLoading && !hasTrades ? (
        <Card>
          <CardContent className="space-y-2 py-4 text-sm text-slate-700">
            <div className="font-medium text-slate-900">No trades yet</div>
            <p className="text-slate-600">Upload your first CSV to populate equity curves and strategy summaries.</p>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {sections.map(section => {
          const Component = componentMap[section.componentKey];
          if (!Component) return null;

          const colSpan = section.defaultSize === "half" ? "lg:col-span-6" : section.defaultSize === "third" ? "lg:col-span-4" : "lg:col-span-12";

          return (
            <div key={section.id} className={`col-span-1 ${colSpan}`}>
              <Component
                overviewMetrics={overviewMetrics}
                equitySeries={equitySeries}
                strategies={strategies}
                statsSummary={summaryStats}
                hasTrades={hasTrades}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
