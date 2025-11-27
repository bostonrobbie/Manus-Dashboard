import MetricCard from "./MetricCard";
import type { PortfolioSummary } from "@shared/types/portfolio";

interface RollingMetricsProps {
  summary?: PortfolioSummary;
}

function RollingMetrics({ summary }: RollingMetricsProps) {
  if (!summary) return null;

  const riskRegime = (() => {
    const sharpe = summary.sharpeRatio ?? 0;
    const maxDrawdown = summary.maxDrawdownPct ?? 0;

    if (sharpe >= 1.5 && maxDrawdown > -15) return "Healthy";
    if ((sharpe >= 0.5 && sharpe < 1.5) || (maxDrawdown <= -15 && maxDrawdown > -25)) return "Normal risk";
    return "Stressed";
  })();

  return (
    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
      <MetricCard label="Total Return" value={`${summary.totalReturnPct.toFixed(2)}%`} />
      <MetricCard label="Max Drawdown" value={`${summary.maxDrawdownPct.toFixed(2)}%`} />
      <MetricCard label="Sharpe Ratio" value={summary.sharpeRatio.toFixed(2)} />
      <MetricCard label="Win Rate" value={`${summary.winRatePct.toFixed(1)}%`} />
      <MetricCard label="Risk regime" value={riskRegime} />
    </div>
  );
}

export default RollingMetrics;
