import { useMemo } from "react";
import { deriveRiskRegime } from "../lib/risk";
import { Badge } from "./ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import type { MonteCarloResult, PortfolioOverview, PortfolioSummary } from "@shared/types/portfolio";

interface TodayPlaybookProps {
  overview?: PortfolioOverview;
  summary?: PortfolioSummary;
  monteCarlo?: MonteCarloResult;
  isLoading: boolean;
  hasError: boolean;
}

function TodayPlaybook({ overview, summary, monteCarlo, isLoading, hasError }: TodayPlaybookProps) {
  const currency = useMemo(
    () =>
      new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      }),
    [],
  );
  const percent = useMemo(
    () =>
      new Intl.NumberFormat(undefined, {
        style: "percent",
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      }),
    [],
  );

  const directionBias = useMemo(() => {
    if (!overview || !summary) return "Mixed / neutral";
    const daily = overview.dailyReturn;
    const total = summary.totalReturnPct;
    if (daily > 0 && total > 0) return "Upside biased";
    if (daily < 0 && total < 0) return "Defensive / downside biased";
    return "Mixed / neutral";
  }, [overview, summary]);

  const riskRegime = deriveRiskRegime(summary);
  const riskBadgeVariant =
    riskRegime === "Healthy" ? "success" : riskRegime === "Normal risk" ? "secondary" : riskRegime === "Checking" ? "secondary" : "warning";

  const forwardStats = useMemo(() => {
    if (!monteCarlo || !monteCarlo.finalEquities.length) return undefined;
    const sorted = [...monteCarlo.finalEquities].sort((a, b) => a - b);
    const medianFinal = sorted[Math.floor(sorted.length / 2)] ?? 0;
    const p10Final = sorted[Math.floor(0.1 * (sorted.length - 1))] ?? 0;
    const p90Final = sorted[Math.floor(0.9 * (sorted.length - 1))] ?? 0;
    const below = sorted.filter(v => v < monteCarlo.currentEquity).length;
    const probBelowCurrent = sorted.length ? (below / sorted.length) * 100 : 0;

    return { medianFinal, p10Final, p90Final, probBelowCurrent };
  }, [monteCarlo]);

  const currentDrawdownPct = useMemo(() => {
    if (!overview) return 0;
    const base = overview.equity || 1;
    return overview.currentDrawdown / base;
  }, [overview]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Today’s playbook</CardTitle>
          <p className="text-xs text-slate-500">Loading today’s playbook…</p>
        </CardHeader>
        <CardContent>
          <div className="h-20 animate-pulse rounded-lg bg-slate-100" />
        </CardContent>
      </Card>
    );
  }

  if (hasError || !overview || !summary) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Today’s playbook</CardTitle>
          <p className="text-xs text-slate-500">No portfolio data yet. Load trades to see today’s setup.</p>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="border-slate-200 bg-white">
      <CardHeader className="flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base">Today’s playbook</CardTitle>
          <p className="text-xs text-slate-500">Plain-language readout of where the portfolio stands right now.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="font-semibold text-slate-900">{directionBias}</span>
          <Badge variant={riskBadgeVariant}>{riskRegime}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-slate-700">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Current posture</p>
          <p className="text-sm text-slate-800">
            Daily P&L {currency.format(overview.dailyPnL)} ({percent.format(overview.dailyReturn)}) • Total return {percent.format((summary.totalReturnPct ?? 0) / 100)}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Risk lens</p>
          <p className="text-sm text-slate-800">
            Max drawdown {percent.format((summary.maxDrawdownPct ?? 0) / 100)} • Current drawdown {percent.format(currentDrawdownPct)}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Forward paths</p>
          {forwardStats ? (
            <p className="text-sm text-slate-800">
              Median path finishes around {currency.format(forwardStats.medianFinal)} with {percent.format(forwardStats.probBelowCurrent / 100)} chance of ending below today’s equity (P10: {currency.format(forwardStats.p10Final)}, P90: {currency.format(forwardStats.p90Final)}).
            </p>
          ) : (
            <p className="text-sm text-slate-500">Run Monte Carlo to get a sense of forward paths.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default TodayPlaybook;
