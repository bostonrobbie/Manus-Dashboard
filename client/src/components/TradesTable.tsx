import type { TradeRow } from "@shared/types/portfolio";

interface TradesTableProps {
  trades: TradeRow[];
  isLoading?: boolean;
}

const currency = new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", minimumFractionDigits: 2 });

function TradesTable({ trades, isLoading }: TradesTableProps) {
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-800">Recent trades</h3>
        <span className="text-xs text-slate-500">{trades.length} fills</span>
      </div>
      <div className="overflow-auto">
        {isLoading ? (
          <div className="h-24 animate-pulse rounded bg-slate-100" />
        ) : trades.length === 0 ? (
          <div className="py-4 text-sm text-slate-500">
            No trades yet for this period. Upload CSVs or connect your data source.
          </div>
        ) : (
          <table className="min-w-full text-sm">
            <thead className="text-left text-slate-500">
              <tr>
                <th className="py-2 pr-3">Symbol</th>
                <th className="py-2 pr-3">Side</th>
                <th className="py-2 pr-3">Qty</th>
                <th className="py-2 pr-3">Entry</th>
                <th className="py-2 pr-3">Exit</th>
                <th className="py-2 pr-3">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {trades.map(trade => (
                <tr key={trade.id}>
                  <td className="py-2 pr-3 font-semibold text-slate-800">{trade.symbol}</td>
                  <td className="py-2 pr-3 capitalize">{trade.side}</td>
                  <td className="py-2 pr-3">{trade.quantity}</td>
                  <td className="py-2 pr-3">{currency.format(trade.entryPrice)}</td>
                  <td className="py-2 pr-3">{currency.format(trade.exitPrice)}</td>
                  <td className="py-2 pr-3">{new Date(trade.exitTime).toISOString().slice(0, 10)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default TradesTable;
