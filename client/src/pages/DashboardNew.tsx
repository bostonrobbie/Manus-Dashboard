import ChartSkeleton from "../components/ChartSkeleton";
import MetricCard from "../components/MetricCard";
import RollingMetrics from "../components/RollingMetrics";
import StrategyComparison from "../components/StrategyComparison";
import TradesTable from "../components/TradesTable";
import { trpc } from "../lib/trpc";
import type { DrawdownPoint, EquityCurvePoint, TradeRow } from "@shared/types/portfolio";

function DashboardNew() {
  const { data: summary } = trpc.analytics.summary.useQuery();
  const { data: overview } = trpc.portfolio.overview.useQuery();
  const { data: equity } = trpc.portfolio.equityCurves.useQuery({ maxPoints: 12 });
  const { data: drawdowns } = trpc.portfolio.drawdowns.useQuery({ maxPoints: 12 });
  const { data: comparison } = trpc.portfolio.strategyComparison.useQuery({
    page: 1,
    pageSize: 25,
    sortBy: "totalReturn",
    sortOrder: "desc",
    filterType: "all",
  });
  const { data: trades } = trpc.portfolio.trades.useQuery();

  return (
    <div className="space-y-6">
      <RollingMetrics summary={summary} />

      {overview ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <MetricCard label="Equity" value={overview.equity.toFixed(2)} />
          <MetricCard label="Daily P&L" value={overview.dailyPnL.toFixed(2)} />
          <MetricCard label="Daily Return" value={`${(overview.dailyReturn * 100).toFixed(2)}%`} />
        </div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ChartSkeleton title="Aggregated equity curve">
          <ul className="space-y-1 text-xs">
            {equity?.points.map((point: EquityCurvePoint) => (
              <li key={point.date} className="flex justify-between">
                <span className="text-slate-500">{point.date}</span>
                <span className="text-slate-800 font-medium">
                  {point.combined.toFixed(2)} / {point.swing.toFixed(2)} / {point.intraday.toFixed(2)} / {point.spx.toFixed(2)}
                </span>
              </li>
            ))}
          </ul>
        </ChartSkeleton>
        <ChartSkeleton title="Drawdown profile">
          <ul className="space-y-1 text-xs">
            {drawdowns?.points.map((point: DrawdownPoint) => (
              <li key={point.date} className="flex justify-between">
                <span className="text-slate-500">{point.date}</span>
                <span className="text-rose-600 font-medium">
                  {point.combined.toFixed(2)} / {point.swing.toFixed(2)} / {point.intraday.toFixed(2)}
                </span>
              </li>
            ))}
          </ul>
        </ChartSkeleton>
      </div>

      <StrategyComparison rows={comparison?.rows ?? []} />
      <TradesTable trades={(trades as TradeRow[]) ?? []} />
    </div>
  );
}

export default DashboardNew;
