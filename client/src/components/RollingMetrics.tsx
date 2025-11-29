import MetricCard from "./MetricCard";
import { Badge } from "./ui/badge";
import { deriveRiskRegime } from "../lib/risk";
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

function RollingMetrics({ summary, isLoading }: RollingMetricsProps) {
  const riskRegime = deriveRiskRegime(summary);
  const totalReturnPct = summary?.totalReturnPct ?? 0;
  const maxDrawdownPct = summary?.maxDrawdownPct ?? 0;
  const sharpeRatio = summary?.sharpeRatio ?? 0;
  const winRatePct = summary?.winRatePct ?? 0;

  const riskBadgeVariant =
    riskRegime === "Healthy" ? "success" : riskRegime === "Normal risk" ? "secondary" : riskRegime === "Checking" ? "secondary" : "warning";

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
      <MetricCard label="Total return" value={percent.format(totalReturnPct / 100)} isLoading={isLoading} />
      <MetricCard label="Max drawdown" value={percent.format(maxDrawdownPct / 100)} isLoading={isLoading} />
      <MetricCard label="Sharpe" value={Number.isFinite(sharpeRatio) ? sharpeRatio.toFixed(2) : "—"} isLoading={isLoading} />
      <MetricCard label="Win rate" value={percent.format(winRatePct / 100)} isLoading={isLoading} />
      <div className="flex flex-col justify-center rounded-lg border border-slate-200 bg-white p-3">
        <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Risk regime</p>
        {isLoading ? (
          <div className="mt-1 h-7 w-20 animate-pulse rounded bg-slate-100" />
        ) : (
          <Badge variant={riskBadgeVariant}>{riskRegime}</Badge>
        )}
      </div>
    </div>
  );
}

export default RollingMetrics;
