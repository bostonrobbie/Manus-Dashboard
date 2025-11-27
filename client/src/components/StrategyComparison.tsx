import type { StrategyComparisonRow } from "@shared/types/portfolio";

interface StrategyComparisonProps {
  rows: StrategyComparisonRow[];
  isLoading?: boolean;
}

const currency = new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const percent = new Intl.NumberFormat(undefined, { style: "percent", minimumFractionDigits: 1, maximumFractionDigits: 2 });

function StrategyComparison({ rows, isLoading }: StrategyComparisonProps) {
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-800">Strategy comparison</h3>
        <span className="text-xs text-slate-500">{rows.length} strategies</span>
      </div>
      <div className="overflow-auto">
        {isLoading ? (
          <div className="h-24 animate-pulse rounded bg-slate-100" />
        ) : rows.length === 0 ? (
          <div className="py-4 text-sm text-slate-500">No strategies yet. Add trades to compare performance.</div>
        ) : (
          <table className="min-w-full text-sm">
            <thead className="text-left text-slate-500">
              <tr>
                <th className="py-2 pr-3">Name</th>
                <th className="py-2 pr-3">Return</th>
                <th className="py-2 pr-3">Drawdown</th>
                <th className="py-2 pr-3">Sharpe</th>
                <th className="py-2 pr-3">Win rate</th>
                <th className="py-2 pr-3">Trades</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map(row => (
                <tr key={row.strategyId}>
                  <td className="py-2 pr-3 font-semibold text-slate-800">
                    {row.name}
                    <span className="ml-2 text-xs text-slate-500 uppercase">{row.type}</span>
                  </td>
                  <td className="py-2 pr-3">{currency.format(row.totalReturn)}</td>
                  <td className="py-2 pr-3">{percent.format(row.maxDrawdownPct / 100)}</td>
                  <td className="py-2 pr-3">{row.sharpeRatio.toFixed(2)}</td>
                  <td className="py-2 pr-3">{percent.format(row.winRatePct / 100)}</td>
                  <td className="py-2 pr-3">{row.totalTrades}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default StrategyComparison;
