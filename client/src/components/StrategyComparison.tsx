import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import type { StrategyComparisonRow } from "@shared/types/portfolio";

interface StrategyComparisonProps {
  rows: StrategyComparisonRow[];
  isLoading?: boolean;
}

const currency = new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const percent = new Intl.NumberFormat(undefined, { style: "percent", minimumFractionDigits: 1, maximumFractionDigits: 2 });

function StrategyComparison({ rows, isLoading }: StrategyComparisonProps) {
  return (
    <Card className="h-full">
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="text-sm">Strategy comparison</CardTitle>
        <span className="text-xs text-slate-500">{rows.length} strategies</span>
      </CardHeader>
      <CardContent>
        <div className="overflow-auto">
          {isLoading ? (
            <div className="h-24 animate-pulse rounded-lg bg-slate-100" />
          ) : rows.length === 0 ? (
            <div className="py-4 text-sm text-slate-500">No strategies yet. Add trades to compare performance.</div>
          ) : (
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-600">
                <tr>
                  <th className="px-3 py-2 font-semibold">Name</th>
                  <th className="px-3 py-2 text-right font-semibold">Return</th>
                  <th className="px-3 py-2 text-right font-semibold">Drawdown</th>
                  <th className="px-3 py-2 text-right font-semibold">Sharpe</th>
                  <th className="px-3 py-2 text-right font-semibold">Win rate</th>
                  <th className="px-3 py-2 text-right font-semibold">Trades</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map(row => (
                  <tr key={row.strategyId} className="hover:bg-slate-50/80">
                    <td className="px-3 py-2 font-semibold text-slate-800">
                      {row.name}
                      <span className="ml-2 text-[11px] uppercase text-slate-500">{row.type}</span>
                    </td>
                    <td className="px-3 py-2 text-right">{currency.format(row.totalReturn)}</td>
                    <td className="px-3 py-2 text-right">{percent.format(row.maxDrawdownPct / 100)}</td>
                    <td className="px-3 py-2 text-right">{row.sharpeRatio.toFixed(2)}</td>
                    <td className="px-3 py-2 text-right">{percent.format(row.winRatePct / 100)}</td>
                    <td className="px-3 py-2 text-right">{row.totalTrades}</td>
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

export default StrategyComparison;
