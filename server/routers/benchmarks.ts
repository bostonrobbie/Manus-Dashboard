import { z } from "zod";

import { buildAggregatedEquityCurve } from "@server/portfolio-engine";
import { TIME_RANGE_PRESETS, deriveDateRangeFromTimeRange } from "@server/utils/timeRange";
import { protectedProcedure, requireUser, router } from "@server/_core/trpc";

const timeRangeInput = z
  .object({
    preset: z.enum(TIME_RANGE_PRESETS),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
  })
  .optional();

export const benchmarksRouter = router({
  equityCurve: protectedProcedure
    .input(z.object({ timeRange: timeRangeInput }).optional())
    .query(async ({ ctx, input }) => {
      const user = requireUser(ctx as any);
      const range = deriveDateRangeFromTimeRange(input?.timeRange);
      const curve = await buildAggregatedEquityCurve(
        { userId: user.id },
        { startDate: range.startDate, endDate: range.endDate },
      );

      return {
        points: curve.points.map(point => ({ date: point.date, benchmark: point.spx })),
      };
    }),
});
