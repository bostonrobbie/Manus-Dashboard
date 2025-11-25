import MetricCard from "./MetricCard";
import type { PortfolioSummary } from "@shared/types/portfolio";

interface RollingMetricsProps {
  summary?: PortfolioSummary;
}

function RollingMetrics({ summary }: RollingMetricsProps) {
  if (!summary) return null;
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <MetricCard label="Total Return" value={`${summary.totalReturnPct.toFixed(2)}%`} />
      <MetricCard label="Max Drawdown" value={`${summary.maxDrawdownPct.toFixed(2)}%`} />
      <MetricCard label="Sharpe Ratio" value={summary.sharpeRatio.toFixed(2)} />
      <MetricCard label="Win Rate" value={`${summary.winRatePct.toFixed(1)}%`} />
    </div>
  );
}

export default RollingMetrics;
