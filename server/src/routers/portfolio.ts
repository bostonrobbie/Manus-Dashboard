import { z } from "zod";
import {
  buildAggregatedEquityCurve,
  buildDrawdownCurves,
  buildPortfolioSummary,
  buildStrategyComparison,
  loadTrades,
} from "../engine/portfolio-engine";
import { authedProcedure, router } from "../trpc/router";

export const portfolioRouter = router({
  equityCurves: authedProcedure
    .input(
      z
        .object({
          startDate: z.string().optional(),
          endDate: z.string().optional(),
          maxPoints: z.number().int().positive().optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      return buildAggregatedEquityCurve(ctx.userId, input ?? {});
    }),
  drawdowns: authedProcedure
    .input(
      z
        .object({
          startDate: z.string().optional(),
          endDate: z.string().optional(),
          maxPoints: z.number().int().positive().optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      return buildDrawdownCurves(ctx.userId, input ?? {});
    }),
  strategyComparison: authedProcedure
    .input(
      z.object({
        page: z.number().int().positive().default(1),
        pageSize: z.number().int().positive().default(10),
        sortBy: z
          .enum([
            "totalReturn",
            "totalReturnPct",
            "maxDrawdown",
            "maxDrawdownPct",
            "sharpeRatio",
            "winRatePct",
            "totalTrades",
            "profitFactor",
            "strategyId",
            "name",
            "type",
          ] as const)
          .default("totalReturn"),
        sortOrder: z.enum(["asc", "desc"]).default("desc"),
        filterType: z.enum(["all", "swing", "intraday"]).default("all"),
        search: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      return buildStrategyComparison({ ...input, userId: ctx.userId });
    }),
  summary: authedProcedure.query(async ({ ctx }) => buildPortfolioSummary(ctx.userId)),
  trades: authedProcedure.query(async ({ ctx }) => loadTrades(ctx.userId)),
});
