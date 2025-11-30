import { useMemo, useState } from "react";

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
  const [sideFilter, setSideFilter] = useState<string>("all");

  const tradesQuery = trpc.portfolio.trades.useQuery({ timeRange }, { retry: 1 });
  const strategiesQuery = trpc.strategies.list.useQuery(undefined, { retry: 1 });

  const strategyLookup = useMemo(() => {
    const map = new Map<number, string>();
    strategiesQuery.data?.forEach(strategy => map.set(strategy.id, strategy.name));
    return map;
  }, [strategiesQuery.data]);

  const filteredTrades = useMemo(() => {
    const trades = tradesQuery.data ?? [];
    return trades
      .filter(trade => (symbolFilter ? trade.symbol.toLowerCase().includes(symbolFilter.toLowerCase()) : true))
      .filter(trade => (strategyFilter === "all" ? true : trade.strategyId === strategyFilter))
      .filter(trade => (sideFilter === "all" ? true : trade.side.toLowerCase() === sideFilter));
  }, [tradesQuery.data, symbolFilter, strategyFilter, sideFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredTrades.length / PAGE_SIZE));
  const startIndex = (page - 1) * PAGE_SIZE;
  const pageTrades = filteredTrades.slice(startIndex, startIndex + PAGE_SIZE);

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
          <h2 className="text-lg font-semibold text-slate-900">Trades</h2>
          <p className="text-sm text-slate-600">Filtered and paginated by current workspace and time range.</p>
        </div>
        {tradesQuery.isError ? (
          <div className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">Unable to load trades.</div>
        ) : null}
      </div>

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
                setSideFilter(event.target.value);
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
          <CardTitle className="text-sm">Trade blotter</CardTitle>
          <p className="text-xs text-slate-500">{filteredTrades.length} trades</p>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {tradesQuery.isLoading ? (
            <div className="h-24 animate-pulse rounded bg-slate-100" />
          ) : pageTrades.length ? (
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
                {pageTrades.map(trade => (
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
