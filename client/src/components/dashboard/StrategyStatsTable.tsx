import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";

export interface StrategySummaryRow {
  strategyId: number;
  name: string;
  instrument?: string;
  type?: string;
  sharpe?: number;
  maxDrawdownPct?: number;
  winRatePct?: number;
  totalTrades?: number;
}

interface StrategyStatsTableProps {
  strategies: StrategySummaryRow[];
  title?: string;
}

export function StrategyStatsTable({ strategies, title = "Strategies" }: StrategyStatsTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="min-w-full text-sm text-slate-700">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
              <th className="py-2 pr-4">Name</th>
              <th className="py-2 pr-4">Instrument</th>
              <th className="py-2 pr-4">Sharpe</th>
              <th className="py-2 pr-4">Max DD</th>
              <th className="py-2 pr-4">Win rate</th>
              <th className="py-2 pr-4">Trades</th>
            </tr>
          </thead>
          <tbody>
            {strategies.map(strategy => (
              <tr key={strategy.strategyId} className="border-t border-slate-100">
                <td className="py-2 pr-4 font-medium text-slate-900">{strategy.name}</td>
                <td className="py-2 pr-4 text-slate-600">{strategy.instrument ?? strategy.type ?? "-"}</td>
                <td className="py-2 pr-4">{strategy.sharpe != null ? strategy.sharpe.toFixed(2) : "-"}</td>
                <td className="py-2 pr-4">{strategy.maxDrawdownPct != null ? `${strategy.maxDrawdownPct.toFixed(1)}%` : "-"}</td>
                <td className="py-2 pr-4">{strategy.winRatePct != null ? `${strategy.winRatePct.toFixed(1)}%` : "-"}</td>
                <td className="py-2 pr-4">{strategy.totalTrades ?? "-"}</td>
              </tr>
            ))}
            {strategies.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-6 text-center text-slate-500">
                  No strategies found for this workspace.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
