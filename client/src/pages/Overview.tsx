import { useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { trpc } from "../lib/trpc";
import { useDashboardState } from "../providers/DashboardProvider";
import MetricCard from "../components/MetricCard";
import RollingMetrics from "../components/RollingMetrics";
import StrategyComparison from "../components/StrategyComparison";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function colorForReturn(pct: number) {
  const intensity = Math.min(1, Math.abs(pct) / 20);
  const alpha = 0.15 + 0.65 * intensity;
  return pct >= 0 ? `rgba(16, 185, 129, ${alpha.toFixed(2)})` : `rgba(248, 113, 113, ${alpha.toFixed(2)})`;
}

function OverviewPage() {
  const { timeRange, workspaceId } = useDashboardState();

  const overviewQuery = trpc.portfolio.overview.useQuery({ timeRange }, { retry: 1 });
  const summaryQuery = trpc.analytics.summary.useQuery({ timeRange }, { retry: 1 });
  const equityQuery = trpc.portfolio.equityCurves.useQuery({ maxPoints: 365, timeRange }, { retry: 1 });
  const drawdownQuery = trpc.portfolio.drawdowns.useQuery({ maxPoints: 365, timeRange }, { retry: 1 });
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
  const equity = useMemo(() => equityQuery.data?.points ?? [], [equityQuery.data?.points]);
  const drawdowns = useMemo(() => drawdownQuery.data?.points ?? [], [drawdownQuery.data?.points]);
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

  const metrics = overview?.metrics;

  const monthlyReturns = useMemo(() => {
    if (!equity.length) return [] as { year: string; month: number; pct: number }[];
    const sorted = [...equity].sort((a, b) => a.date.localeCompare(b.date));
    const map = new Map<string, { start: number; end: number; year: string; month: number }>();
    const baseCapital = overview ? overview.equity - overview.totalReturn : 0;

    sorted.forEach(point => {
      const [year, monthStr] = point.date.split("-");
      const month = Number(monthStr) - 1;
      const key = `${year}-${month}`;
      if (!map.has(key)) {
        map.set(key, { start: point.combined, end: point.combined, year, month });
      } else {
        map.get(key)!.end = point.combined;
      }
    });

    return Array.from(map.values()).map(entry => {
      const startEquity = baseCapital + entry.start;
      const endEquity = baseCapital + entry.end;
      const pct = startEquity !== 0 ? ((endEquity - startEquity) / startEquity) * 100 : 0;
      return { year: entry.year, month: entry.month, pct };
    });
  }, [equity, overview]);

  const years = useMemo(
    () => Array.from(new Set(monthlyReturns.map(m => m.year))).sort((a, b) => Number(b) - Number(a)),
    [monthlyReturns],
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
            <Line type="monotone" dataKey="combined" name="Equity" stroke="#0f172a" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="spx" name="Benchmark" stroke="#1d4ed8" strokeWidth={2} dot={false} />
            <Legend />
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
          <AreaChart data={drawdowns} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis tickFormatter={val => `${Number(val).toFixed(1)}%`} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
            <Tooltip formatter={value => `${Number(value).toFixed(2)}%`} />
            <Area type="monotone" dataKey="combined" name="Drawdown" stroke="#f97316" fill="#f9731622" />
          </AreaChart>
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
          <p className="text-sm text-slate-600">Workspace overview of equity, drawdowns, and risk signals.</p>
        </div>
        {overviewQuery.isError || summaryQuery.isError ? (
          <div className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">Failed to load latest stats.</div>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <MetricCard
          label="Total return"
          value={metrics ? percent.format(metrics.totalReturnPct / 100) : summary ? percent.format(summary.totalReturnPct) : undefined}
          helper={metrics?.alpha != null ? `Alpha ${percent.format(metrics.alpha / 100)}` : undefined}
          isLoading={overviewQuery.isLoading || summaryQuery.isLoading}
        />
        <MetricCard
          label="Max drawdown"
          value={metrics ? percent.format(metrics.maxDrawdownPct / 100) : summary ? percent.format(summary.maxDrawdownPct) : undefined}
          helper={overview ? currency.format(overview.maxDrawdown) : undefined}
          isLoading={overviewQuery.isLoading || summaryQuery.isLoading}
        />
        <MetricCard
          label="Sharpe"
          value={metrics ? metrics.sharpe.toFixed(2) : overview ? overview.sharpeRatio.toFixed(2) : undefined}
          helper={metrics ? `Sortino ${metrics.sortino.toFixed(2)}` : undefined}
          isLoading={overviewQuery.isLoading}
        />
        <MetricCard
          label="Profit factor"
          value={metrics ? metrics.profitFactor.toFixed(2) : overview ? overview.profitFactor.toFixed(2) : undefined}
          helper={metrics ? `Payoff ${metrics.payoffRatio.toFixed(2)}` : undefined}
          isLoading={overviewQuery.isLoading}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <MetricCard
          label="Expectancy / trade"
          value={
            metrics
              ? currency.format(metrics.expectancyPerTrade)
              : overview?.expectancy != null
                ? currency.format(overview.expectancy)
                : undefined
          }
          helper={metrics ? `${percent.format(metrics.lossRatePct / 100)} loss rate` : undefined}
          isLoading={overviewQuery.isLoading}
        />
        <MetricCard
          label="Win rate"
          value={metrics ? percent.format(metrics.winRatePct / 100) : overview ? percent.format(overview.winRate) : undefined}
          helper={overview ? `${overview.totalTrades} trades` : undefined}
          isLoading={overviewQuery.isLoading}
        />
        <MetricCard
          label="Trade count"
          value={overview?.totalTrades?.toLocaleString()}
          helper={overview ? `${overview.winningTrades} wins / ${overview.losingTrades} losses` : undefined}
          isLoading={overviewQuery.isLoading}
        />
        <MetricCard
          label="Current equity"
          value={overview ? currency.format(overview.equity) : undefined}
          helper="Workspace scoped"
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
          <CardTitle className="text-sm">Monthly returns</CardTitle>
          <p className="text-xs text-slate-500">Color-coded grid of monthly performance versus starting equity.</p>
        </CardHeader>
        <CardContent className="space-y-3">
          {equityQuery.isLoading ? (
            <div className="h-36 animate-pulse rounded bg-slate-100" />
          ) : monthlyReturns.length ? (
            <div className="space-y-3 text-xs text-slate-700">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <span className="h-3 w-3 rounded-sm bg-emerald-400/60" />
                  <span>Positive</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="h-3 w-3 rounded-sm bg-rose-400/60" />
                  <span>Negative</span>
                </div>
              </div>
              <div className="overflow-x-auto">
                <div className="min-w-full space-y-2">
                  {years.map(year => (
                    <div key={year} className="flex items-center gap-2">
                      <div className="w-10 text-xs font-semibold text-slate-600">{year}</div>
                      <div className="grid flex-1 grid-cols-12 gap-1">
                        {MONTH_LABELS.map((label, idx) => {
                          const cell = monthlyReturns.find(r => r.year === year && r.month === idx);
                          const pct = cell?.pct;
                          const background = pct != null ? colorForReturn(pct) : "#e2e8f0";
                          return (
                            <div
                              key={label}
                              className="rounded px-1 py-2 text-center"
                              style={{ backgroundColor: background }}
                              title={pct != null ? `${pct.toFixed(2)}%` : "No data"}
                            >
                              <div className="text-[11px] font-medium text-slate-800">{label}</div>
                              <div className="text-[10px] text-slate-700">{pct != null ? `${pct.toFixed(1)}%` : "-"}</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              Not enough data to build monthly returns for this window.
            </div>
          )}
        </CardContent>
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
