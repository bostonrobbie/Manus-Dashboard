import { useMemo, useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { trpc } from "../lib/trpc";
import { useDashboardState } from "../providers/DashboardProvider";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import MetricCard from "../components/MetricCard";
import type { CustomPortfolioContribution } from "@shared/types/portfolio";

function PortfoliosPage() {
  const { timeRange } = useDashboardState();
  const strategiesQuery = trpc.strategies.list.useQuery(undefined, { retry: 1 });
  const buildPortfolio = trpc.portfolio.customPortfolio.useMutation();

  const [selected, setSelected] = useState<Record<number, boolean>>({});
  const [weights, setWeights] = useState<Record<number, number>>({});

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

  const selectedStrategyIds = useMemo(
    () => Object.entries(selected).filter(([, checked]) => checked).map(([id]) => Number(id)),
    [selected],
  );

  const isBuilding = buildPortfolio.isPending;

  const handleBuild = () => {
    if (!selectedStrategyIds.length) return;
    const weightArray = selectedStrategyIds.map(id => weights[id] ?? 1);
    buildPortfolio.mutate({
      strategyIds: selectedStrategyIds as [number, ...number[]],
      weights: weightArray,
      timeRange,
      maxPoints: 365,
    });
  };

  const equityPoints = buildPortfolio.data?.equityCurve.points ?? [];
  const metrics = buildPortfolio.data?.metrics;
  const contributions: CustomPortfolioContribution[] = useMemo(
    () => buildPortfolio.data?.contributions ?? [],
    [buildPortfolio.data?.contributions],
  );
  const totalTrades = useMemo(() => contributions.reduce<number>((sum, c) => sum + c.tradeCount, 0), [contributions]);

  const equityChart = (
    <div className="h-64">
      {isBuilding ? (
        <div className="h-full animate-pulse rounded bg-slate-100" />
      ) : equityPoints.length ? (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={equityPoints} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis tickFormatter={val => currency.format(val as number)} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
            <Tooltip formatter={value => currency.format(Number(value))} />
            <Line type="monotone" dataKey="combined" name="Equity" stroke="#0f172a" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="spx" name="Benchmark" stroke="#1d4ed8" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex h-full items-center justify-center rounded border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-600">
          Select strategies and build a portfolio to see the equity curve.
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Custom portfolios</h2>
          <p className="text-sm text-slate-600">Combine strategies with optional weights to explore virtual performance.</p>
        </div>
        {buildPortfolio.isError ? (
          <div className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">Unable to build portfolio.</div>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-sm">Strategies</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {strategiesQuery.isLoading ? (
              <div className="h-24 animate-pulse rounded bg-slate-100" />
            ) : strategiesQuery.data?.length ? (
              <div className="space-y-2">
                {strategiesQuery.data.map(strategy => (
                  <div
                    key={strategy.id}
                    className="flex items-center justify-between rounded border border-slate-200 px-3 py-2 text-sm shadow-sm"
                  >
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={Boolean(selected[strategy.id])}
                        onChange={event =>
                          setSelected(prev => ({ ...prev, [strategy.id]: event.target.checked }))
                        }
                      />
                      <span className="font-medium text-slate-900">{strategy.name}</span>
                      <span className="text-xs uppercase text-slate-500">{strategy.type}</span>
                    </label>
                    <input
                      type="number"
                      className="w-20 rounded border border-slate-200 px-2 py-1 text-right text-xs"
                      placeholder="1"
                      value={weights[strategy.id] ?? ""}
                      onChange={event => {
                        const value = Number(event.target.value);
                        setWeights(prev => ({ ...prev, [strategy.id]: Number.isFinite(value) ? value : 1 }));
                      }}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-600">No strategies available for this workspace.</p>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardContent className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="text-sm text-slate-700">
                Select at least one strategy, adjust optional weights, then build the virtual portfolio.
              </div>
              <Button onClick={handleBuild} disabled={!selectedStrategyIds.length || isBuilding}>
                {isBuilding ? "Building..." : "Build portfolio"}
              </Button>
            </CardContent>
          </Card>

          {metrics ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Virtual portfolio</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  <MetricCard label="Total return" value={percent.format(metrics.totalReturnPct / 100)} />
                  <MetricCard label="Max drawdown" value={percent.format(metrics.maxDrawdownPct / 100)} />
                  <MetricCard label="Sharpe" value={metrics.sharpe.toFixed(2)} helper={`Sortino ${metrics.sortino.toFixed(2)}`} />
                  <MetricCard label="Profit factor" value={metrics.profitFactor.toFixed(2)} />
                </div>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  <MetricCard label="Expectancy" value={currency.format(metrics.expectancyPerTrade)} />
                  <MetricCard label="Win rate" value={percent.format(metrics.winRatePct / 100)} />
                  <MetricCard label="Trade count" value={totalTrades.toLocaleString()} />
                  <MetricCard
                    label="Avg win / loss"
                    value={`${currency.format(metrics.avgWin)} / ${currency.format(metrics.avgLoss)}`}
                  />
                </div>
                {equityChart}
                {contributions.length ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 text-sm">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Strategy</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Weight</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Return</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Max DD</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Sharpe</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Trades</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {contributions.map(row => (
                          <tr key={row.strategyId}>
                            <td className="px-3 py-2 font-semibold text-slate-900">{row.name}</td>
                            <td className="px-3 py-2 text-slate-600">{percent.format(row.weight)}</td>
                            <td className="px-3 py-2 text-slate-600">{percent.format(row.totalReturnPct / 100)}</td>
                            <td className="px-3 py-2 text-slate-600">{percent.format(row.maxDrawdownPct / 100)}</td>
                            <td className="px-3 py-2 text-slate-600">{row.sharpeRatio.toFixed(2)}</td>
                            <td className="px-3 py-2 text-slate-600">{row.tradeCount.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default PortfoliosPage;
