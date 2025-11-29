import type { PortfolioSummary } from "@shared/types/portfolio";

export function deriveRiskRegime(summary?: PortfolioSummary) {
  if (!summary) return "Checking";
  const sharpe = Number.isFinite(summary.sharpeRatio) ? summary.sharpeRatio : 0;
  const maxDrawdown = Number.isFinite(summary.maxDrawdownPct) ? summary.maxDrawdownPct : 0;

  if (sharpe >= 1.5 && maxDrawdown > -15) return "Healthy";
  if ((sharpe >= 0.5 && sharpe < 1.5) || (maxDrawdown <= -15 && maxDrawdown > -30)) return "Normal risk";
  return "Stressed";
}
