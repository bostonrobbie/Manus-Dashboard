import { z } from "zod";

import { ENGINE_CONFIG } from "../portfolio-engine";
import { getPortfolioOverview, getPortfolioSummaryMetrics } from "../services/tradePipeline";
import { TIME_RANGE_PRESETS } from "../utils/timeRange";
import { protectedProcedure, requireUser, router } from "../_core/trpc";

const timeRangeInput = z
  .object({
    preset: z.enum(TIME_RANGE_PRESETS),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
  })
  .optional();

export const analyticsRouter = router({
  summary: protectedProcedure
    .input(
      z
        .object({
          timeRange: timeRangeInput,
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const user = requireUser(ctx as any);
      return getPortfolioSummaryMetrics({ userId: user.id, timeRange: input?.timeRange });
    }),
  rangeMetrics: protectedProcedure
    .input(
      z
        .object({
          timeRange: timeRangeInput,
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const user = requireUser(ctx as any);
      const [overview, summary] = await Promise.all([
        getPortfolioOverview({ userId: user.id, timeRange: input?.timeRange }),
        getPortfolioSummaryMetrics({ userId: user.id, timeRange: input?.timeRange }),
      ]);

      const pnl = overview.equity - ENGINE_CONFIG.initialCapital;
      const pnlPct = summary.totalReturnPct;
      const tradeCount = overview.totalTrades;
      const winRate = overview.winRate;

      return {
        pnl,
        pnlPct,
        tradeCount,
        winRate,
        maxDrawdown: overview.maxDrawdown,
        maxDrawdownPct: summary.maxDrawdownPct,
      };
    }),
});
