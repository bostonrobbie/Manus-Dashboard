import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer } from "recharts";

import { trpc } from "../lib/trpc";
import { useDashboardState } from "../providers/DashboardProvider";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";

const PAGE_SIZE = 15;

function TradesPage() {
  const { timeRange } = useDashboardState();
  const [page, setPage] = useState(1);
  const [symbolFilter, setSymbolFilter] = useState("");
  const [strategyFilter, setStrategyFilter] = useState<number | "all">("all");
  const [sideFilter, setSideFilter] = useState<"all" | "long" | "short">("all");
  const [autoRefresh, setAutoRefresh] = useState(false);

  useEffect(() => {
    setPage(1);
  }, [timeRange]);

  const tradeFilters = useMemo(
    () => ({
      timeRange,
      symbol: symbolFilter.trim() || undefined,
      strategyId: strategyFilter === "all" ? undefined : strategyFilter,
      side: sideFilter === "all" ? undefined : sideFilter,
    }),
    [timeRange, symbolFilter, strategyFilter, sideFilter],
  );

  const tradesQuery = trpc.portfolio.trades.useQuery({ ...tradeFilters, page, pageSize: PAGE_SIZE }, {
    retry: 1,
    refetchInterval: autoRefresh ? 15000 : false,
  });
  const tradesSummaryQuery = trpc.portfolio.trades.useQuery({ ...tradeFilters, page: 1, pageSize: 500 }, {
    retry: 1,
    refetchInterval: autoRefresh ? 15000 : false,
  });
  const strategiesQuery = trpc.strategies.list.useQuery(undefined, { retry: 1 });

  const strategyLookup = useMemo(() => {
    const map = new Map<number, string>();
    strategiesQuery.data?.forEach(strategy => map.set(strategy.id, strategy.name));
    return map;
  }, [strategiesQuery.data]);

  const trades = useMemo(() => {
    const rows = tradesQuery.data?.rows ?? [];
    return [...rows].sort((a, b) => b.exitTime.localeCompare(a.exitTime));
  }, [tradesQuery.data]);
  const total = tradesQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const summaryTrades = tradesSummaryQuery.data?.rows ?? trades;

  const tradeStats = useMemo(() => {
    if (!summaryTrades.length) {
      return { winRate: 0, profitFactor: 0, expectancy: 0, avgR: null };
    }

    let wins = 0;
    let grossWin = 0;
    let grossLoss = 0;
    let expectancySum = 0;
    let rValues: number[] = [];

    for (const trade of summaryTrades) {
      const pnl = (Number(trade.exitPrice) - Number(trade.entryPrice)) * Number(trade.quantity);
      expectancySum += pnl;
      if (pnl > 0) {
        wins += 1;
        grossWin += pnl;
      } else if (pnl < 0) {
        grossLoss += pnl;
      }
      if (trade.initialRisk) {
        const r = pnl / trade.initialRisk;
        if (Number.isFinite(r)) rValues.push(r);
      }
    }

    const totalTrades = summaryTrades.length;
    const winRate = totalTrades ? (wins / totalTrades) * 100 : 0;
    const profitFactor = grossLoss !== 0 ? grossWin / Math.abs(grossLoss) : 0;
    const expectancy = totalTrades ? expectancySum / totalTrades : 0;
    const avgR = rValues.length ? rValues.reduce((a, b) => a + b, 0) / rValues.length : null;

    return { winRate, profitFactor, expectancy, avgR };
  }, [summaryTrades]);

  const histogramData = useMemo(() => {
    if (!summaryTrades.length) return [] as { bin: string; count: number }[];
    const values = summaryTrades
      .map(trade => {
        const pnl = (Number(trade.exitPrice) - Number(trade.entryPrice)) * Number(trade.quantity);
        if (trade.initialRisk) {
          const r = pnl / trade.initialRisk;
          if (Number.isFinite(r)) return r;
        }
        return pnl;
      })
      .filter(v => Number.isFinite(v));

    const min = Math.min(...values);
    const max = Math.max(...values);
    const binCount = 10;
    const span = max - min || 1;
    const binSize = span / binCount;
    const bins = Array.from({ length: binCount }, () => ({ bin: "", count: 0 }));

    values.forEach(value => {
      const idx = Math.min(binCount - 1, Math.floor((value - min) / binSize));
      bins[idx].count += 1;
    });

    for (let i = 0; i < binCount; i++) {
      const lower = min + i * binSize;
      const upper = lower + binSize;
      bins[i].bin = `${lower.toFixed(1)}-${upper.toFixed(1)}`;
    }

    return bins;
  }, [summaryTrades]);

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

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Trade log</h2>
          <p className="text-sm text-slate-600">Chronological feed of trades for this workspace and time range.</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-slate-600">
            <input type="checkbox" checked={autoRefresh} onChange={event => setAutoRefresh(event.target.checked)} />
            Auto refresh
          </label>
          {tradesQuery.isError ? (
            <div className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">Unable to load trades.</div>
          ) : null}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Summary</CardTitle>
        </CardHeader>
        <CardContent>
          {tradesSummaryQuery.isLoading ? (
            <div className="h-16 animate-pulse rounded bg-slate-100" />
          ) : (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <div className="rounded border border-slate-200 bg-white p-3 text-sm shadow-sm">
                <div className="text-xs uppercase tracking-wide text-slate-500">Profit factor</div>
                <div className="text-lg font-semibold text-slate-900">{tradeStats.profitFactor.toFixed(2)}</div>
              </div>
              <div className="rounded border border-slate-200 bg-white p-3 text-sm shadow-sm">
                <div className="text-xs uppercase tracking-wide text-slate-500">Expectancy</div>
                <div className="text-lg font-semibold text-slate-900">{currency.format(tradeStats.expectancy)}</div>
              </div>
              <div className="rounded border border-slate-200 bg-white p-3 text-sm shadow-sm">
                <div className="text-xs uppercase tracking-wide text-slate-500">Win rate</div>
                <div className="text-lg font-semibold text-slate-900">{tradeStats.winRate.toFixed(1)}%</div>
              </div>
              <div className="rounded border border-slate-200 bg-white p-3 text-sm shadow-sm">
                <div className="text-xs uppercase tracking-wide text-slate-500">Avg R</div>
                <div className="text-lg font-semibold text-slate-900">{tradeStats.avgR != null ? tradeStats.avgR.toFixed(2) : "-"}</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Filters</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <div className="flex flex-col gap-1 text-sm">
            <label className="text-xs uppercase tracking-wide text-slate-500">Symbol</label>
            <input
              className="rounded-md border border-slate-200 px-3 py-2 text-sm"
              placeholder="e.g. SPY"
              value={symbolFilter}
              onChange={event => {
                setSymbolFilter(event.target.value);
                setPage(1);
              }}
            />
          </div>
          <div className="flex flex-col gap-1 text-sm">
            <label className="text-xs uppercase tracking-wide text-slate-500">Strategy</label>
            <select
              className="rounded-md border border-slate-200 px-3 py-2 text-sm"
              value={strategyFilter === "all" ? "all" : strategyFilter}
              onChange={event => {
                const value = event.target.value === "all" ? "all" : Number(event.target.value);
                setStrategyFilter(value);
                setPage(1);
              }}
            >
              <option value="all">All</option>
              {strategiesQuery.data?.map(strategy => (
                <option key={strategy.id} value={strategy.id}>
                  {strategy.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1 text-sm">
            <label className="text-xs uppercase tracking-wide text-slate-500">Side</label>
            <select
              className="rounded-md border border-slate-200 px-3 py-2 text-sm"
              value={sideFilter}
              onChange={event => {
                const value = event.target.value as "all" | "long" | "short";
                setSideFilter(value);
                setPage(1);
              }}
            >
              <option value="all">All</option>
              <option value="long">Long</option>
              <option value="short">Short</option>
            </select>
          </div>
          <div className="flex flex-col justify-end gap-2 text-sm">
            <Button variant="outline" size="sm" onClick={() => { setSymbolFilter(""); setStrategyFilter("all"); setSideFilter("all"); setPage(1); }}>
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Trade distribution</CardTitle>
          <p className="text-xs text-slate-500">Histogram of PnL or R-multiples for the current filters.</p>
        </CardHeader>
        <CardContent className="h-64">
          {tradesSummaryQuery.isLoading ? (
            <div className="h-full animate-pulse rounded bg-slate-100" />
          ) : histogramData.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={histogramData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <Bar dataKey="count" name="Trades" fill="#0f172a" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center rounded border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-600">
              Not enough trades to plot a distribution.
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Trade blotter</CardTitle>
          <p className="text-xs text-slate-500">{total} trades</p>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {tradesQuery.isLoading ? (
            <div className="h-24 animate-pulse rounded bg-slate-100" />
          ) : trades.length ? (
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Date</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Symbol</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Strategy</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Side</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Quantity</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Entry</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Exit</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">PnL</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {trades.map(trade => (
                  <tr key={trade.id} className="hover:bg-slate-50">
                    <td className="px-3 py-2 text-slate-600">{trade.exitTime.split("T")[0]}</td>
                    <td className="px-3 py-2 font-semibold text-slate-900">{trade.symbol}</td>
                    <td className="px-3 py-2 text-slate-600">{strategyLookup.get(trade.strategyId) ?? "-"}</td>
                    <td className="px-3 py-2">
                      <Badge variant={trade.side === "long" ? "success" : "secondary"}>{trade.side}</Badge>
                    </td>
                    <td className="px-3 py-2 text-slate-600">{Number(trade.quantity).toLocaleString()}</td>
                    <td className="px-3 py-2 text-slate-600">{currency.format(Number(trade.entryPrice))}</td>
                    <td className="px-3 py-2 text-slate-600">{currency.format(Number(trade.exitPrice))}</td>
                    <td className="px-3 py-2 font-semibold text-slate-900">
                      {currency.format((Number(trade.exitPrice) - Number(trade.entryPrice)) * Number(trade.quantity))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="rounded border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              No trades match these filters or the selected time range.
            </div>
          )}
        </CardContent>
        <div className="flex items-center justify-between border-t px-4 py-3 text-sm text-slate-700">
          <span>
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => Math.max(1, p - 1))}>
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page === totalPages}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

export default TradesPage;
