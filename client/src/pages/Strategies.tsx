import { useEffect, useMemo, useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { trpc } from "../lib/trpc";
import { useDashboardState } from "../providers/DashboardProvider";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import MetricCard from "../components/MetricCard";

type SortKey =
  | "name"
  | "totalReturn"
  | "totalReturnPct"
  | "maxDrawdown"
  | "maxDrawdownPct"
  | "sharpeRatio"
  | "profitFactor"
  | "expectancy"
  | "totalTrades";

type SortOrder = "asc" | "desc";

function StrategiesPage() {
  const { timeRange } = useDashboardState();
  const [sortBy, setSortBy] = useState<SortKey>("totalReturn");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [selectedStrategyId, setSelectedStrategyId] = useState<number | null>(null);

  const strategiesQuery = trpc.portfolio.strategyComparison.useQuery(
    {
      page: 1,
      pageSize: 25,
      sortBy,
      sortOrder,
      filterType: "all",
      timeRange,
    },
    { retry: 1 },
  );
  const tradesQuery = trpc.portfolio.trades.useQuery({ timeRange, page: 1, pageSize: 200 }, { retry: 1 });
  const strategyEquityQuery = trpc.portfolio.strategyEquity.useQuery(
    { strategyId: selectedStrategyId ?? 0, timeRange, maxPoints: 120 },
    { enabled: selectedStrategyId != null },
  );
  const summaryQuery = trpc.analytics.summary.useQuery({ timeRange }, { retry: 1 });

  const selectedTrades = useMemo(
    () => tradesQuery.data?.rows?.filter(trade => trade.strategyId === selectedStrategyId) ?? [],
    [selectedStrategyId, tradesQuery.data],
  );

  const handleSort = (key: SortKey) => {
    if (sortBy === key) {
      setSortOrder(prev => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(key);
      setSortOrder("desc");
    }
  };

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

  const selectedStrategy = strategiesQuery.data?.rows.find(row => row.strategyId === selectedStrategyId);
  const aggregatedStrategyMetrics = useMemo(() => {
    const rows = strategiesQuery.data?.rows ?? [];
    if (!rows.length) return null;
    const totalTrades = rows.reduce((sum, row) => sum + row.totalTrades, 0);
    const weightFor = (row: (typeof rows)[number]) => {
      if (totalTrades === 0) return 1 / rows.length;
      return row.totalTrades / totalTrades;
    };

    return {
      name: "All strategies",
      totalReturnPct: rows.reduce((sum, row) => sum + row.totalReturnPct * weightFor(row), 0),
      maxDrawdownPct: rows.reduce((sum, row) => sum + row.maxDrawdownPct * weightFor(row), 0),
      sharpeRatio: rows.reduce((sum, row) => sum + row.sharpeRatio * weightFor(row), 0),
      profitFactor: rows.reduce((sum, row) => sum + row.profitFactor * weightFor(row), 0),
      expectancy: rows.reduce((sum, row) => sum + (row.expectancy ?? 0) * weightFor(row), 0),
      winRatePct: rows.reduce((sum, row) => sum + row.winRatePct * weightFor(row), 0),
      totalTrades,
    };
  }, [strategiesQuery.data]);

  const focusMetrics = selectedStrategy ?? aggregatedStrategyMetrics;
  const focusTitle = selectedStrategy?.name ?? aggregatedStrategyMetrics?.name ?? "Strategy performance";
  const strategyEquityPoints = strategyEquityQuery.data?.points ?? [];
  const equityChart = (
    <div className="h-64">
      {strategyEquityQuery.isFetching ? (
        <div className="h-full animate-pulse rounded bg-slate-100" />
      ) : strategyEquityPoints.length ? (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={strategyEquityPoints} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis tickFormatter={val => currency.format(val as number)} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
            <Tooltip formatter={value => currency.format(Number(value))} />
            <Line type="monotone" dataKey="combined" stroke="#0f172a" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex h-full items-center justify-center rounded border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-600">
          Select a strategy to view its equity curve.
        </div>
      )}
    </div>
  );

  useEffect(() => {
    if (!selectedStrategyId && strategiesQuery.data?.rows?.length) {
      setSelectedStrategyId(strategiesQuery.data.rows[0].strategyId);
    }
  }, [selectedStrategyId, strategiesQuery.data]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Strategy performance</h2>
          <p className="text-sm text-slate-600">How each strategy performs within this workspace and time range.</p>
        </div>
        {strategiesQuery.isError ? (
          <div className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">Failed to load strategies.</div>
        ) : null}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">{focusTitle}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <MetricCard
              label="Total return"
              value={
                focusMetrics
                  ? percent.format(("totalReturnPct" in focusMetrics ? focusMetrics.totalReturnPct : 0))
                  : summaryQuery.data
                    ? percent.format(summaryQuery.data.totalReturnPct)
                    : undefined
              }
              helper={selectedStrategy ? currency.format(selectedStrategy.totalReturn) : undefined}
              isLoading={strategiesQuery.isLoading || summaryQuery.isLoading}
            />
            <MetricCard
              label="Max drawdown"
              value={focusMetrics ? percent.format(focusMetrics.maxDrawdownPct) : undefined}
              helper={selectedStrategy ? currency.format(selectedStrategy.maxDrawdown) : undefined}
              isLoading={strategiesQuery.isLoading}
            />
            <MetricCard
              label="Sharpe"
              value={focusMetrics ? focusMetrics.sharpeRatio.toFixed(2) : undefined}
              helper={selectedStrategy?.sortinoRatio ? `Sortino ${selectedStrategy.sortinoRatio.toFixed(2)}` : undefined}
              isLoading={strategiesQuery.isLoading}
            />
            <MetricCard
              label="Profit factor"
              value={focusMetrics ? focusMetrics.profitFactor.toFixed(2) : undefined}
              helper={selectedStrategy?.payoffRatio ? `Payoff ${selectedStrategy.payoffRatio.toFixed(2)}` : undefined}
              isLoading={strategiesQuery.isLoading}
            />
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            <MetricCard
              label="Expectancy"
              value={
                focusMetrics
                  ? currency.format("expectancy" in focusMetrics && focusMetrics.expectancy != null ? focusMetrics.expectancy : 0)
                  : undefined
              }
              helper={selectedStrategy?.payoffRatio ? `Payoff ${selectedStrategy.payoffRatio.toFixed(2)}` : undefined}
              isLoading={strategiesQuery.isLoading}
            />
            <MetricCard
              label="Win rate"
              value={focusMetrics ? percent.format((focusMetrics.winRatePct ?? 0) / 100) : undefined}
              helper={focusMetrics ? `${focusMetrics.totalTrades.toLocaleString()} trades` : undefined}
              isLoading={strategiesQuery.isLoading}
            />
            <MetricCard
              label="Trade count"
              value={focusMetrics ? focusMetrics.totalTrades.toLocaleString() : undefined}
              isLoading={strategiesQuery.isLoading}
            />
          </div>
          <div className="rounded border border-slate-200 bg-white p-3 text-sm text-slate-700 shadow-sm">{equityChart}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Strategy table</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {strategiesQuery.isLoading ? (
            <div className="h-24 animate-pulse rounded bg-slate-100" />
          ) : strategiesQuery.data?.rows?.length ? (
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="cursor-pointer px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600" onClick={() => handleSort("name")}>
                    Name
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Type</th>
                  <th
                    className="cursor-pointer px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600"
                    onClick={() => handleSort("totalTrades")}
                  >
                    Trades
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Curve</th>
                  <th
                    className="cursor-pointer px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600"
                    onClick={() => handleSort("totalReturnPct")}
                  >
                    Total return
                  </th>
                  <th
                    className="cursor-pointer px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600"
                    onClick={() => handleSort("maxDrawdownPct")}
                  >
                    Max DD
                  </th>
                  <th
                    className="cursor-pointer px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600"
                    onClick={() => handleSort("sharpeRatio")}
                  >
                    Sharpe
                  </th>
                  <th
                    className="cursor-pointer px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600"
                    onClick={() => handleSort("profitFactor")}
                  >
                    Profit factor
                  </th>
                  <th
                    className="cursor-pointer px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600"
                    onClick={() => handleSort("expectancy")}
                  >
                    Expectancy
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Win rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {strategiesQuery.data.rows.map(row => {
                  const sparkline = row.sparkline ?? [];
                  return (
                    <tr
                      key={row.strategyId}
                      className={`hover:bg-slate-50 ${selectedStrategyId === row.strategyId ? "bg-indigo-50" : ""}`}
                      onClick={() => setSelectedStrategyId(row.strategyId)}
                    >
                      <td className="px-3 py-2 font-semibold text-slate-900">{row.name}</td>
                      <td className="px-3 py-2 text-slate-600">{row.type}</td>
                      <td className="px-3 py-2 text-slate-600">{row.totalTrades}</td>
                      <td className="px-3 py-2 text-slate-600">
                        {sparkline.length ? (
                          <div className="h-12 w-32">
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart data={sparkline} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                                <Line type="monotone" dataKey="value" stroke="#0f172a" dot={false} strokeWidth={1.5} />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-500">-</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-slate-900">{percent.format(row.totalReturnPct)}</td>
                      <td className="px-3 py-2 text-slate-600">{percent.format(row.maxDrawdownPct)}</td>
                      <td className="px-3 py-2 text-slate-600">{row.sharpeRatio.toFixed(2)}</td>
                      <td className="px-3 py-2 text-slate-600">{row.profitFactor.toFixed(2)}</td>
                      <td className="px-3 py-2 text-slate-600">{row.expectancy != null ? currency.format(row.expectancy) : "-"}</td>
                      <td className="px-3 py-2 text-slate-600">{percent.format(row.winRatePct / 100)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="rounded border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              No strategies found for this workspace/time range.
            </div>
          )}
        </CardContent>
      </Card>

      {selectedStrategy ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Recent trades for {selectedStrategy.name}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
              {selectedTrades.length ? (
                <ul className="divide-y divide-slate-200">
                  {selectedTrades.slice(0, 10).map(trade => (
                    <li key={trade.id} className="flex items-center justify-between py-2">
                      <div>
                        <div className="font-medium">{trade.symbol}</div>
                        <p className="text-xs text-slate-500">{trade.entryTime} → {trade.exitTime}</p>
                      </div>
                      <Badge variant={trade.side === "long" ? "success" : "secondary"}>{trade.side}</Badge>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-600">No trades mapped to this strategy in the current range.</p>
              )}
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

export default StrategiesPage;
