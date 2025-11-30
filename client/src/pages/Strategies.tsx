import { useMemo, useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { trpc } from "../lib/trpc";
import { useDashboardState } from "../providers/DashboardProvider";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import MetricCard from "../components/MetricCard";

type SortKey = "name" | "totalReturn" | "totalReturnPct" | "maxDrawdown" | "sharpeRatio";

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

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Strategies</h2>
          <p className="text-sm text-slate-600">Per-strategy returns, drawdowns, and participation.</p>
        </div>
        {strategiesQuery.isError ? (
          <div className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">Failed to load strategies.</div>
        ) : null}
      </div>

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
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Symbol</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Trades</th>
                  <th
                    className="cursor-pointer px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600"
                    onClick={() => handleSort("totalReturn")}
                  >
                    PnL
                  </th>
                  <th
                    className="cursor-pointer px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600"
                    onClick={() => handleSort("maxDrawdown")}
                  >
                    Max DD
                  </th>
                  <th
                    className="cursor-pointer px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600"
                    onClick={() => handleSort("sharpeRatio")}
                  >
                    Sharpe
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Win rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {strategiesQuery.data.rows.map(row => (
                  <tr
                    key={row.strategyId}
                    className="hover:bg-slate-50"
                    onClick={() => setSelectedStrategyId(row.strategyId)}
                  >
                    <td className="px-3 py-2 font-semibold text-slate-900">{row.name}</td>
                    <td className="px-3 py-2 text-slate-600">{row.type}</td>
                    <td className="px-3 py-2 text-slate-600">{row.totalTrades}</td>
                    <td className="px-3 py-2 text-slate-900">{currency.format(row.totalReturn)}</td>
                    <td className="px-3 py-2 text-slate-600">{currency.format(row.maxDrawdown)}</td>
                    <td className="px-3 py-2 text-slate-600">{row.sharpeRatio.toFixed(2)}</td>
                    <td className="px-3 py-2 text-slate-600">{percent.format(row.winRatePct / 100)}</td>
                  </tr>
                ))}
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
            <CardTitle className="text-sm">{selectedStrategy.name} detail</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <MetricCard label="Return" value={currency.format(selectedStrategy.totalReturn)} helper={percent.format(selectedStrategy.totalReturnPct)} />
              <MetricCard label="Max drawdown" value={currency.format(selectedStrategy.maxDrawdown)} helper={percent.format(selectedStrategy.maxDrawdownPct)} />
              <MetricCard label="Sharpe" value={selectedStrategy.sharpeRatio.toFixed(2)} />
              <MetricCard label="Win rate" value={percent.format(selectedStrategy.winRatePct / 100)} helper={`${selectedStrategy.totalTrades} trades`} />
            </div>
            <div className="rounded border border-slate-200 bg-white p-3 text-sm text-slate-700 shadow-sm">{equityChart}</div>
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
