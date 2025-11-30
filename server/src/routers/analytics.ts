import { z } from "zod";

import { router, authedProcedure } from "@server/trpc/router";
import { buildPortfolioOverview, buildPortfolioSummary, ENGINE_CONFIG } from "@server/engine/portfolio-engine";
import { TIME_RANGE_PRESETS, deriveDateRangeFromTimeRange } from "@server/utils/timeRange";
import { requireWorkspaceAccess } from "@server/auth/workspaceAccess";

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
      const { workspace } = await requireWorkspaceAccess(ctx.user, "read");
      const range = deriveDateRangeFromTimeRange(input?.timeRange);
      const scope = { userId: ctx.user.id, workspaceId: workspace?.id ?? ctx.user.workspaceId };
      return buildPortfolioSummary(scope, range);
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
      const { workspace } = await requireWorkspaceAccess(ctx.user, "read");
      const range = deriveDateRangeFromTimeRange(input?.timeRange);
      const scope = { userId: ctx.user.id, workspaceId: workspace?.id ?? ctx.user.workspaceId };
      const [overview, summary] = await Promise.all([
        buildPortfolioOverview(scope, range),
        buildPortfolioSummary(scope, range),
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
