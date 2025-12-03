import { z } from "zod";

import { router, authedProcedure } from "@server/trpc/router";
import { ENGINE_CONFIG } from "@server/engine/portfolio-engine";
import { TIME_RANGE_PRESETS } from "@server/utils/timeRange";
import { getPortfolioOverview, getPortfolioSummaryMetrics } from "@server/services/tradePipeline";
import { requireUser } from "@server/trpc/authHelpers";

const timeRangeInput = z
  .object({
    preset: z.enum(TIME_RANGE_PRESETS),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
  })
  .optional();

export const analyticsRouter = router({
  summary: authedProcedure
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
  rangeMetrics: authedProcedure
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
