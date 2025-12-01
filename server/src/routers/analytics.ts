import { z } from "zod";

import { router, authedProcedure } from "@server/trpc/router";
import { ENGINE_CONFIG } from "@server/engine/portfolio-engine";
import { TIME_RANGE_PRESETS } from "@server/utils/timeRange";
import { requireWorkspaceAccess } from "@server/auth/workspaceAccess";
import { getWorkspaceOverview, getWorkspaceSummaryMetrics } from "@server/services/tradePipeline";

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
      const workspaceId = workspace?.id ?? ctx.user.workspaceId;
      if (!workspaceId) {
        throw new Error("Workspace is required for analytics");
      }
      return getWorkspaceSummaryMetrics({ userId: ctx.user.id, workspaceId, timeRange: input?.timeRange });
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
      const workspaceId = workspace?.id ?? ctx.user.workspaceId;
      if (!workspaceId) {
        throw new Error("Workspace is required for analytics");
      }
      const [overview, summary] = await Promise.all([
        getWorkspaceOverview({ userId: ctx.user.id, workspaceId, timeRange: input?.timeRange }),
        getWorkspaceSummaryMetrics({ userId: ctx.user.id, workspaceId, timeRange: input?.timeRange }),
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
