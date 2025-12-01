import { useMemo } from "react";
import type { JSX } from "react";

import { PortfolioEquityChart } from "../components/dashboard/PortfolioEquityChart";
import { StatsPanel } from "../components/dashboard/StatsPanel";
import { StrategyEquityGrid } from "../components/dashboard/StrategyEquityGrid";
import { StrategyStatsTable } from "../components/dashboard/StrategyStatsTable";
import MetricCard from "../components/MetricCard";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { dashboardSections } from "../config/dashboardLayoutConfig";
import { trpc } from "../lib/trpc";
import { useDashboardState } from "../providers/DashboardProvider";

const componentMap: Record<string, (args: any) => JSX.Element> = {
  portfolioSummary: ({ overview }: any) => {
    const metrics = overview?.metrics;
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
          value={metrics ? percent.format(metrics.totalReturnPct / 100) : overview ? percent.format(overview.totalReturnPct / 100) : undefined}
          helper={metrics?.alpha != null ? `Alpha ${percent.format((metrics.alpha ?? 0) / 100)}` : undefined}
          isLoading={!overview}
        />
        <MetricCard
          label="Max drawdown"
          value={metrics ? percent.format(metrics.maxDrawdownPct / 100) : overview ? `${overview.maxDrawdownPct?.toFixed(2) ?? "0"}%` : undefined}
          helper={overview ? currency.format(overview.maxDrawdown) : undefined}
          isLoading={!overview}
        />
        <MetricCard
          label="Sharpe"
          value={metrics ? metrics.sharpe.toFixed(2) : overview ? overview.sharpeRatio.toFixed(2) : undefined}
          helper={metrics ? `Sortino ${metrics.sortino.toFixed(2)}` : undefined}
          isLoading={!overview}
        />
        <MetricCard
          label="Profit factor"
          value={metrics ? metrics.profitFactor.toFixed(2) : overview ? overview.profitFactor.toFixed(2) : undefined}
          helper={metrics ? `Payoff ${metrics.payoffRatio.toFixed(2)}` : undefined}
          isLoading={!overview}
        />
      </div>
    );
  },
  portfolioEquity: ({ equitySeries, overview }: any) => (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Portfolio equity</CardTitle>
      </CardHeader>
      <CardContent>
        <PortfolioEquityChart
          equitySeries={equitySeries}
          stats={{
            sharpe: overview?.metrics?.sharpe,
            maxDrawdownPct: overview?.metrics?.maxDrawdownPct,
            winRatePct: overview?.metrics?.winRatePct,
            tradeCount: overview?.totalTrades,
          }}
        />
      </CardContent>
    </Card>
  ),
  strategyTable: ({ strategies }: any) => <StrategyStatsTable strategies={strategies} />,
  strategyEquityGrid: ({ strategies }: any) => <StrategyEquityGrid strategies={strategies} />,
  alerts: ({ overview }: any) => (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Attention</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 text-sm text-slate-700">
          <div className="rounded-md bg-amber-50 px-3 py-2 text-amber-800">
            Max drawdown: {overview?.metrics?.maxDrawdownPct?.toFixed(2) ?? "0"}%
          </div>
          <StatsPanel
            title="Snapshot"
            sharpe={overview?.metrics?.sharpe}
            maxDrawdown={overview?.metrics?.maxDrawdownPct}
            winRate={overview?.metrics?.winRatePct}
            tradeCount={overview?.totalTrades}
          />
        </div>
      </CardContent>
    </Card>
  ),
};

export default function HomeDashboardPage() {
  const { timeRange } = useDashboardState();

  const overviewQuery = trpc.portfolio.overview.useQuery({ timeRange }, { retry: 1 });
  const equityQuery = trpc.portfolio.equityCurves.useQuery({ maxPoints: 240, timeRange }, { retry: 1 });
  const strategyQuery = trpc.portfolio.strategyComparison.useQuery(
    {
      page: 1,
      pageSize: 6,
      sortBy: "totalReturn",
      sortOrder: "desc",
      filterType: "all",
      timeRange,
    },
    { retry: 1 },
  );

  const overview = overviewQuery.data;
  const equitySeries = useMemo(() => {
    const points = equityQuery.data?.points ?? [];
    const start = 10000;
    return points.map(pt => ({
      date: pt.date,
      value: start + pt.combined,
      benchmark: start + pt.spx,
    }));
  }, [equityQuery.data?.points]);

  const strategies = useMemo(() => {
    return (
      strategyQuery.data?.rows?.map(row => ({
        strategyId: row.strategyId,
        name: row.name,
        instrument: row.type,
        type: row.type,
        sharpe: row.sharpeRatio,
        maxDrawdownPct: row.maxDrawdownPct,
        winRatePct: row.winRatePct,
        totalTrades: row.totalTrades,
        equityCurve: row.sparkline?.map(p => ({ value: 10000 + p.value, date: p.date })) ?? [],
      })) ?? []
    );
  }, [strategyQuery.data?.rows]);

  const sections = dashboardSections.filter(section => section.visibleByDefault).sort((a, b) => a.defaultOrder - b.defaultOrder);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Home dashboard</h2>
        <p className="text-sm text-slate-600">Portfolio overview, strategy stats, and quick alerts for your workspace.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {sections.map(section => {
          const Component = componentMap[section.componentKey];
          if (!Component) return null;

          const colSpan = section.defaultSize === "half" ? "lg:col-span-6" : section.defaultSize === "third" ? "lg:col-span-4" : "lg:col-span-12";

          return (
            <div key={section.id} className={`col-span-1 ${colSpan}`}>
              <Component overview={overview} equitySeries={equitySeries} strategies={strategies} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
