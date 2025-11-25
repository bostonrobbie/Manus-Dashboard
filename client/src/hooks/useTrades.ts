import { trpc } from "../lib/trpc";

export function useTrades() {
  return trpc.portfolio.trades.useQuery();
}
