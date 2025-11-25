import { trpc } from "../lib/trpc";

export function usePortfolio() {
  const summary = trpc.analytics.summary.useQuery();
  const curves = trpc.portfolio.equityCurves.useQuery({ maxPoints: 20 });

  return {
    summary,
    curves,
  };
}
