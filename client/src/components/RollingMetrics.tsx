import MetricCard from "./MetricCard";
import type { PortfolioSummary } from "@shared/types/portfolio";

interface RollingMetricsProps {
  summary?: PortfolioSummary;
  isLoading?: boolean;
}

const percent = new Intl.NumberFormat(undefined, {
  style: "percent",
  minimumFractionDigits: 1,
  maximumFractionDigits: 2,
});

function deriveRiskRegime(summary?: PortfolioSummary) {
  if (!summary) return "Checking";
  const sharpe = Number.isFinite(summary.sharpeRatio) ? summary.sharpeRatio : 0;
  const maxDrawdown = Number.isFinite(summary.maxDrawdownPct) ? summary.maxDrawdownPct : 0;

  if (sharpe >= 1.5 && maxDrawdown > -15) return "Healthy";
  if ((sharpe >= 0.5 && sharpe < 1.5) || (maxDrawdown <= -15 && maxDrawdown > -30)) return "Normal risk";
  return "Stressed";
}

function RollingMetrics({ summary, isLoading }: RollingMetricsProps) {
  const riskRegime = deriveRiskRegime(summary);
  const totalReturnPct = summary?.totalReturnPct ?? 0;
  const maxDrawdownPct = summary?.maxDrawdownPct ?? 0;
  const sharpeRatio = summary?.sharpeRatio ?? 0;
  const winRatePct = summary?.winRatePct ?? 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
      <MetricCard label="Total Return" value={percent.format(totalReturnPct / 100)} isLoading={isLoading} />
      <MetricCard label="Max Drawdown" value={percent.format(maxDrawdownPct / 100)} isLoading={isLoading} />
      <MetricCard label="Sharpe Ratio" value={sharpeRatio.toFixed(2)} isLoading={isLoading} />
      <MetricCard label="Win Rate" value={percent.format(winRatePct / 100)} isLoading={isLoading} />
      <MetricCard label="Risk regime" value={riskRegime} isLoading={isLoading} />
    </div>
  );
}

export default RollingMetrics;
