import { useMemo } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { trpc } from "../lib/trpc";
import { useDashboardState } from "../providers/DashboardProvider";
import MetricCard from "../components/MetricCard";
import RollingMetrics from "../components/RollingMetrics";
import StrategyComparison from "../components/StrategyComparison";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";

function OverviewPage() {
  const { timeRange, workspaceId } = useDashboardState();

  const overviewQuery = trpc.portfolio.overview.useQuery({ timeRange }, { retry: 1 });
  const summaryQuery = trpc.analytics.summary.useQuery({ timeRange }, { retry: 1 });
  const equityQuery = trpc.portfolio.equityCurves.useQuery({ maxPoints: 90, timeRange }, { retry: 1 });
  const drawdownQuery = trpc.portfolio.drawdowns.useQuery({ maxPoints: 90, timeRange }, { retry: 1 });
  const rangeMetricsQuery = trpc.analytics.rangeMetrics.useQuery({ timeRange }, { retry: 1 });
  const comparisonQuery = trpc.portfolio.strategyComparison.useQuery(
    {
      page: 1,
      pageSize: 5,
      sortBy: "totalReturn",
      sortOrder: "desc",
      filterType: "all",
      timeRange,
    },
    { retry: 1 },
  );

  const overview = overviewQuery.data;
  const summary = summaryQuery.data;
  const equity = equityQuery.data?.points ?? [];
  const drawdowns = drawdownQuery.data?.points ?? [];
  const rangeMetrics = rangeMetricsQuery.data;
  const comparison = comparisonQuery.data;

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

  const equityChart = (
    <div className="h-64">
      {equityQuery.isLoading ? (
        <div className="h-full animate-pulse rounded bg-slate-100" />
      ) : equity.length ? (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={equity} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis tickFormatter={val => currency.format(val as number)} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
            <Tooltip formatter={value => currency.format(Number(value))} />
            <Line type="monotone" dataKey="combined" stroke="#0f172a" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex h-full items-center justify-center rounded border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-600">
          No equity history yet. Upload trades or benchmarks for workspace {workspaceId ?? "(unspecified)"}.
        </div>
      )}
    </div>
  );

  const drawdownChart = (
    <div className="h-48">
      {drawdownQuery.isLoading ? (
        <div className="h-full animate-pulse rounded bg-slate-100" />
      ) : drawdowns.length ? (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={drawdowns} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis tickFormatter={val => currency.format(val as number)} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
            <Tooltip formatter={value => currency.format(Number(value))} />
            <Line type="monotone" dataKey="combined" stroke="#f97316" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex h-full items-center justify-center rounded border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-600">
          No drawdown history available for this window.
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Overview</h2>
          <p className="text-sm text-slate-600">Workspace-aware snapshot for operators and traders.</p>
        </div>
        {overviewQuery.isError || summaryQuery.isError ? (
          <div className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">Failed to load latest stats.</div>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <MetricCard
          label="Current equity"
          value={overview ? currency.format(overview.equity) : undefined}
          helper="Workspace scoped"
          isLoading={overviewQuery.isLoading}
        />
        <MetricCard
          label="PnL (period)"
          value={overview ? currency.format(overview.totalReturn) : undefined}
          helper={summary ? percent.format(summary.totalReturnPct) : undefined}
          isLoading={overviewQuery.isLoading || summaryQuery.isLoading}
        />
        <MetricCard
          label="Max drawdown"
          value={overview ? currency.format(overview.maxDrawdown) : undefined}
          helper={summary ? percent.format(summary.maxDrawdownPct) : undefined}
          isLoading={overviewQuery.isLoading || summaryQuery.isLoading}
        />
        <MetricCard
          label="Win rate"
          value={overview ? percent.format(overview.winRate) : undefined}
          helper={overview ? `${overview.totalTrades} trades` : undefined}
          isLoading={overviewQuery.isLoading}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <MetricCard
          label="PnL in range"
          value={rangeMetrics ? currency.format(rangeMetrics.pnl) : undefined}
          helper={rangeMetrics ? percent.format(rangeMetrics.pnlPct / 100) : undefined}
          isLoading={rangeMetricsQuery.isLoading}
        />
        <MetricCard
          label="Trades in range"
          value={rangeMetrics?.tradeCount?.toLocaleString()}
          helper={rangeMetrics ? `${rangeMetrics.winRate.toFixed(1)}% win rate` : undefined}
          isLoading={rangeMetricsQuery.isLoading}
        />
        <MetricCard
          label="Max drawdown (range)"
          value={rangeMetrics ? currency.format(rangeMetrics.maxDrawdown) : undefined}
          helper={rangeMetrics ? percent.format(rangeMetrics.maxDrawdownPct / 100) : undefined}
          isLoading={rangeMetricsQuery.isLoading}
        />
        <MetricCard label="Time window" value={timeRange?.preset ?? "Custom"} helper="Synced with Manus scope" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Equity curve</CardTitle>
          <p className="text-xs text-slate-500">Respects workspace and global time range.</p>
        </CardHeader>
        <CardContent>{equityChart}</CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Drawdown</CardTitle>
          <p className="text-xs text-slate-500">Depth of pullbacks during the selected time range.</p>
        </CardHeader>
        <CardContent>{drawdownChart}</CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Performance summary</CardTitle>
          <p className="text-xs text-slate-500">Sharpe, drawdowns, and returns for the selected range.</p>
        </CardHeader>
        <CardContent>
          <RollingMetrics summary={summary} isLoading={summaryQuery.isLoading} />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Top strategies</CardTitle>
            <p className="text-xs text-slate-500">Sorted by total return within the selected time window.</p>
          </CardHeader>
          <CardContent>
            {comparisonQuery.isLoading ? (
              <div className="h-24 animate-pulse rounded bg-slate-100" />
            ) : comparison?.rows?.length ? (
              <ul className="divide-y divide-slate-200 text-sm text-slate-800">
                {comparison.rows.slice(0, 5).map(row => (
                  <li key={row.strategyId} className="flex items-center justify-between py-2">
                    <div>
                      <div className="font-medium">{row.name}</div>
                      <p className="text-xs text-slate-500">{row.type} · {row.totalTrades} trades</p>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">{currency.format(row.totalReturn)}</div>
                      <div className="text-xs text-slate-500">{percent.format(row.totalReturnPct)}</div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="rounded border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                No strategy performance yet. Upload trades to populate this list.
              </div>
            )}
          </CardContent>
        </Card>

        <StrategyComparison rows={comparison?.rows ?? []} isLoading={comparisonQuery.isLoading} />
      </div>
    </div>
  );
}

export default OverviewPage;
