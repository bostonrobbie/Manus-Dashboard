import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { getCustomPortfolioAnalytics, getStrategyAnalytics } from "@server/services/tradePipeline";
import { TIME_RANGE_PRESETS } from "@server/utils/timeRange";
import { protectedProcedure, requireUser, router } from "@server/_core/trpc";

const timeRangeInput = z
  .object({
    preset: z.enum(TIME_RANGE_PRESETS),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
  })
  .optional();

const strategyIdArray = z.array(z.number().int());

export const compareStrategiesRouter = router({
  list: protectedProcedure
    .input(
      z
        .object({
          page: z.number().int().min(1).optional(),
          pageSize: z.number().int().min(1).max(200).optional(),
          sortBy: z.string().optional(),
          sortOrder: z.enum(["asc", "desc"]).optional(),
          filterType: z.enum(["all", "swing", "intraday"]).optional(),
          search: z.string().optional(),
          timeRange: timeRangeInput,
          startDate: z.string().optional(),
          endDate: z.string().optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const user = requireUser(ctx as any);
      return getStrategyAnalytics({
        userId: user.id,
        input: {
          page: input?.page,
          pageSize: input?.pageSize,
          sortBy: input?.sortBy as any,
          sortOrder: input?.sortOrder,
          filterType: input?.filterType,
          search: input?.search,
          timeRange: input?.timeRange,
          startDate: input?.startDate,
          endDate: input?.endDate,
        },
      });
    }),
  customPortfolio: protectedProcedure
    .input(
      z
        .object({
          strategyIds: strategyIdArray,
          weights: z.array(z.number()).optional(),
          timeRange: timeRangeInput,
          maxPoints: z.number().int().min(10).max(2000).optional(),
        }),
    )
    .query(async ({ ctx, input }) => {
      const user = requireUser(ctx as any);
      if (input.strategyIds.length < 2 || input.strategyIds.length > 4) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Array must contain between 2 and 4 strategies" });
      }
      return getCustomPortfolioAnalytics({
        userId: user.id,
        strategyIds: input.strategyIds,
        weights: input.weights,
        timeRange: input.timeRange,
        maxPoints: input.maxPoints,
      });
    }),
});
