import type { TradeRow } from "@shared/types/portfolio";

interface TradesTableProps {
  trades: TradeRow[];
}

function TradesTable({ trades }: TradesTableProps) {
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-800">Recent trades</h3>
        <span className="text-xs text-slate-500">{trades.length} fills</span>
      </div>
      <div className="overflow-auto">
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
                <td className="py-2 pr-3">{trade.side}</td>
                <td className="py-2 pr-3">{trade.quantity}</td>
                <td className="py-2 pr-3">{trade.entryPrice.toFixed(2)}</td>
                <td className="py-2 pr-3">{trade.exitPrice.toFixed(2)}</td>
                <td className="py-2 pr-3">{new Date(trade.exitTime).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default TradesTable;
