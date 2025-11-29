import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  buildAggregatedEquityCurve,
  buildDrawdownCurves,
  buildPortfolioOverview,
  buildPortfolioSummary,
  buildStrategyComparison,
  runMonteCarloSimulation,
  loadTrades,
  generateTradesCsv,
} from "@server/engine/portfolio-engine";
import { authedProcedure, router } from "@server/trpc/router";
import { ingestTradesCsv } from "@server/services/tradeIngestion";
import { TIME_RANGE_PRESETS, deriveDateRangeFromTimeRange } from "@server/utils/timeRange";

const finiteNumber = z.number().finite();
const equityPointSchema = z.object({
  date: z.string(),
  combined: finiteNumber,
  swing: finiteNumber,
  intraday: finiteNumber,
  spx: finiteNumber,
});
const drawdownPointSchema = z.object({
  date: z.string(),
  combined: finiteNumber,
  swing: finiteNumber,
  intraday: finiteNumber,
  spx: finiteNumber,
});
const overviewSchema = z.object({
  equity: finiteNumber,
  dailyPnL: finiteNumber,
  dailyReturn: finiteNumber,
  totalReturn: finiteNumber,
  sharpeRatio: finiteNumber,
  maxDrawdown: finiteNumber,
  currentDrawdown: finiteNumber,
  totalTrades: z.number().int(),
  winningTrades: z.number().int(),
  losingTrades: z.number().int(),
  winRate: finiteNumber,
  profitFactor: finiteNumber,
  positions: z.number().int(),
  lastUpdated: z.date(),
});
const summarySchema = z.object({
  totalReturnPct: finiteNumber,
  maxDrawdownPct: finiteNumber,
  sharpeRatio: finiteNumber,
  winRatePct: finiteNumber,
});
const strategyRowSchema = z.object({
  strategyId: z.number().int(),
  name: z.string(),
  type: z.enum(["swing", "intraday"]),
  totalReturn: finiteNumber,
  totalReturnPct: finiteNumber,
  maxDrawdown: finiteNumber,
  maxDrawdownPct: finiteNumber,
  sharpeRatio: finiteNumber,
  winRatePct: finiteNumber,
  totalTrades: z.number().int(),
  profitFactor: finiteNumber,
});
const monteCarloSchema = z.object({
  futureDates: z.array(z.string()),
  p10: z.array(finiteNumber),
  p50: z.array(finiteNumber),
  p90: z.array(finiteNumber),
  currentEquity: finiteNumber,
  finalEquities: z.array(finiteNumber),
});
const exportTradesResponseSchema = z.object({
  filename: z.string(),
  mimeType: z.string(),
  content: z.string(),
});
const tradeIngestionResultSchema = z.object({
  importedCount: z.number().int(),
  skippedCount: z.number().int(),
  errors: z.array(z.string()),
});

const timeRangeInput = z
  .object({
    preset: z.enum(TIME_RANGE_PRESETS),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
  })
  .optional();

export const portfolioRouter = router({
  overview: authedProcedure
    .input(
      z
        .object({
          timeRange: timeRangeInput,
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const range = deriveDateRangeFromTimeRange(input?.timeRange);
      return overviewSchema.parse(await buildPortfolioOverview(ctx.userId, range));
    }),
  equityCurves: authedProcedure
    .input(
      z
        .object({
          startDate: z.string().optional(),
          endDate: z.string().optional(),
          maxPoints: z.number().int().positive().optional(),
          timeRange: timeRangeInput,
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const range = deriveDateRangeFromTimeRange(input?.timeRange);
      const res = await buildAggregatedEquityCurve(ctx.userId, {
        startDate: input?.startDate ?? range.startDate,
        endDate: input?.endDate ?? range.endDate,
        maxPoints: input?.maxPoints,
      });
      return { points: res.points.map(p => equityPointSchema.parse(p)) };
    }),
  drawdowns: authedProcedure
    .input(
      z
        .object({
          startDate: z.string().optional(),
          endDate: z.string().optional(),
          maxPoints: z.number().int().positive().optional(),
          timeRange: timeRangeInput,
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const range = deriveDateRangeFromTimeRange(input?.timeRange);
      const res = await buildDrawdownCurves(ctx.userId, {
        startDate: input?.startDate ?? range.startDate,
        endDate: input?.endDate ?? range.endDate,
        maxPoints: input?.maxPoints,
      });
      return { points: res.points.map(p => drawdownPointSchema.parse(p)) };
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
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        timeRange: timeRangeInput,
      })
    )
    .query(async ({ ctx, input }) => {
      const range = deriveDateRangeFromTimeRange(input.timeRange);
      const result = await buildStrategyComparison({
        ...input,
        userId: ctx.userId,
        startDate: input.startDate ?? range.startDate,
        endDate: input.endDate ?? range.endDate,
      });
      return {
        rows: result.rows.map(row => strategyRowSchema.parse(row)),
        total: result.total,
      };
    }),
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
      return summarySchema.parse(await buildPortfolioSummary(ctx.userId, range));
    }),
  trades: authedProcedure
    .input(
      z
        .object({
          timeRange: timeRangeInput,
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const range = deriveDateRangeFromTimeRange(input?.timeRange);
      return loadTrades(ctx.userId, range);
    }),
  exportTradesCsv: authedProcedure
    .input(
      z.object({
        strategyIds: z.array(z.number().int()).optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        timeRange: timeRangeInput,
      }),
    )
    .output(exportTradesResponseSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const range = deriveDateRangeFromTimeRange(input.timeRange);
        const csvString = await generateTradesCsv({
          userId: ctx.userId,
          strategyIds: input.strategyIds,
          startDate: input.startDate ?? range.startDate,
          endDate: input.endDate ?? range.endDate,
        });

        return exportTradesResponseSchema.parse({
          filename: "trades-export.csv",
          mimeType: "text/csv",
          content: csvString,
        });
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to export trades",
        });
      }
    }),
  uploadTradesCsv: authedProcedure
    .input(
      z.object({
        csv: z.string(),
        strategyName: z.string().optional(),
        strategyType: z.enum(["swing", "intraday"]).optional(),
      }),
    )
    .output(tradeIngestionResultSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const result = await ingestTradesCsv({
          csv: input.csv,
          userId: ctx.userId,
          defaultStrategyName: input.strategyName,
          defaultStrategyType: input.strategyType,
        });
        return tradeIngestionResultSchema.parse(result);
      } catch (error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: error instanceof Error ? error.message : "Failed to ingest trades",
        });
      }
    }),
  monteCarloSimulation: authedProcedure
    .input(
      z.object({
        days: z.number().int().min(7).max(365).default(90),
        simulations: z.number().int().min(100).max(5000).default(500),
        timeRange: timeRangeInput,
      })
    )
    .query(async ({ ctx, input }) =>
      monteCarloSchema.parse(
        await runMonteCarloSimulation({
          userId: ctx.userId,
          days: input.days,
          simulations: input.simulations,
          ...deriveDateRangeFromTimeRange(input.timeRange),
        }),
      ),
    ),
});
