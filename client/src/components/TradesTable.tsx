import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import type { TradeRow } from "@shared/types/portfolio";

type TradeLike = Omit<TradeRow, "quantity"> & { quantity?: number; pnl?: number; pnlPercent?: number };

interface TradesTableProps {
  trades: TradeLike[];
  isLoading?: boolean;
  action?: ReactNode;
}

const currency = new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", minimumFractionDigits: 2 });
const percent = new Intl.NumberFormat(undefined, { style: "percent", minimumFractionDigits: 1, maximumFractionDigits: 2 });
const dateFormatter = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function TradesTable({ trades, isLoading, action }: TradesTableProps) {
  return (
    <Card className="h-full">
      <CardHeader className="flex-row items-center justify-between">
        <div>
          <CardTitle className="text-sm">Recent trades</CardTitle>
          <p className="text-xs text-slate-500">Latest fills across your strategies</p>
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-500">
          {action}
          <span>{trades.length} fills</span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-auto">
          {isLoading ? (
            <div className="h-24 animate-pulse rounded-lg bg-slate-100" />
          ) : trades.length === 0 ? (
            <div className="py-4 text-sm text-slate-500">
              No trades yet for this period. Upload CSVs or connect your data source.
            </div>
          ) : (
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-600">
                <tr>
                  <th className="px-3 py-2 font-semibold">Symbol</th>
                  <th className="px-3 py-2 font-semibold">Side</th>
                  <th className="px-3 py-2 text-right font-semibold">Qty</th>
                  <th className="px-3 py-2 text-right font-semibold">Entry</th>
                  <th className="px-3 py-2 text-right font-semibold">Exit</th>
                  <th className="px-3 py-2 text-right font-semibold">PnL</th>
                  <th className="px-3 py-2 text-right font-semibold">Exit time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {trades.map(trade => (
                  <tr key={trade.id} className="hover:bg-slate-50/80">
                    <td className="px-3 py-2 font-semibold text-slate-800">{trade.symbol}</td>
                    <td className="px-3 py-2">
                      <Badge variant={trade.side.toLowerCase() === "buy" || trade.side.toLowerCase() === "long" ? "success" : "destructive"}>
                        {trade.side}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-right">{trade.quantity ?? 0}</td>
                    <td className="px-3 py-2 text-right">{currency.format(trade.entryPrice)}</td>
                    <td className="px-3 py-2 text-right">{currency.format(trade.exitPrice)}</td>
                    <td className="px-3 py-2 text-right">
                      {trade.pnl != null ? (
                        <div className="flex flex-col items-end gap-0.5">
                          <span className={trade.pnl >= 0 ? "text-green-600" : "text-red-600"}>{currency.format(trade.pnl)}</span>
                          {trade.pnlPercent != null ? (
                            <span className="text-xs text-slate-500">{percent.format(trade.pnlPercent / 100)}</span>
                          ) : null}
                        </div>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-3 py-2 text-right">{dateFormatter.format(new Date(trade.exitTime))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default TradesTable;
