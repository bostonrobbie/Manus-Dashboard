import { z } from "zod";

import { router, authedProcedure } from "@server/trpc/router";
import { buildPortfolioSummary } from "@server/engine/portfolio-engine";
import { TIME_RANGE_PRESETS, deriveDateRangeFromTimeRange } from "@server/utils/timeRange";

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
      const range = deriveDateRangeFromTimeRange(input?.timeRange);
      return buildPortfolioSummary(ctx.userId, range);
    }),
});
