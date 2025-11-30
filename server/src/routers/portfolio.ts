import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  buildAggregatedEquityCurve,
  buildDrawdownCurves,
  buildPortfolioOverview,
  buildPortfolioSummary,
  buildStrategyComparison,
  runMonteCarloSimulation,
  loadTradesPage,
  generateTradesCsv,
} from "@server/engine/portfolio-engine";
import { authedProcedure, router } from "@server/trpc/router";
import { ingestTradesCsv } from "@server/services/tradeIngestion";
import { ingestBenchmarksCsv } from "@server/services/benchmarkIngestion";
import { TIME_RANGE_PRESETS, deriveDateRangeFromTimeRange } from "@server/utils/timeRange";
import { env } from "@server/utils/env";

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
const tradeRowSchema = z.object({
  id: z.number().int(),
  userId: z.number().int().optional(),
  workspaceId: z.number().int().optional(),
  strategyId: z.number().int(),
  symbol: z.string(),
  side: z.string(),
  quantity: finiteNumber,
  entryPrice: finiteNumber,
  exitPrice: finiteNumber,
  entryTime: z.string(),
  exitTime: z.string(),
});
const ingestionHeaderIssuesSchema = z
  .object({ missing: z.array(z.string()), unexpected: z.array(z.string()) })
  .optional();
const tradeIngestionResultSchema = z.object({
  importedCount: z.number().int(),
  skippedCount: z.number().int(),
  failedCount: z.number().int(),
  errors: z.array(z.string()),
  warnings: z.array(z.string()),
  uploadId: z.number().int().optional(),
  headerIssues: ingestionHeaderIssuesSchema,
});
const benchmarkIngestionResultSchema = tradeIngestionResultSchema;

const MAX_UPLOAD_BYTES = env.maxUploadBytes ?? 5 * 1024 * 1024;

const timeRangeInput = z
  .object({
    preset: z.enum(TIME_RANGE_PRESETS),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
  })
  .optional();

export function enforceUploadGuards(csv: string, fileName?: string) {
  const sizeBytes = Buffer.byteLength(csv, "utf8");
  if (sizeBytes > MAX_UPLOAD_BYTES) {
    throw new TRPCError({
      code: "PAYLOAD_TOO_LARGE",
      message: `File exceeds maximum size of ${formatBytes(MAX_UPLOAD_BYTES)}`,
    });
  }

  if (fileName) {
    const lower = fileName.toLowerCase();
    if (!(lower.endsWith(".csv") || lower.endsWith(".txt"))) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Only CSV uploads are allowed",
      });
    }
  }

  if (!csv.trim()) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "CSV content is empty" });
  }
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 102.4) / 10} KB`;
  return `${Math.round(bytes / 104857.6) / 10} MB`;
}

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
      const scope = { userId: ctx.user.id, workspaceId: ctx.user.workspaceId };
      return overviewSchema.parse(await buildPortfolioOverview(scope, range));
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
      const scope = { userId: ctx.user.id, workspaceId: ctx.user.workspaceId };
      const res = await buildAggregatedEquityCurve(scope, {
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
      const scope = { userId: ctx.user.id, workspaceId: ctx.user.workspaceId };
      const res = await buildDrawdownCurves(scope, {
        startDate: input?.startDate ?? range.startDate,
        endDate: input?.endDate ?? range.endDate,
        maxPoints: input?.maxPoints,
      });
      return { points: res.points.map(p => drawdownPointSchema.parse(p)) };
    }),
  strategyEquity: authedProcedure
    .input(
      z.object({
        strategyId: z.number().int(),
        timeRange: timeRangeInput,
        maxPoints: z.number().int().positive().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const range = deriveDateRangeFromTimeRange(input.timeRange);
      const scope = { userId: ctx.user.id, workspaceId: ctx.user.workspaceId };
      const res = await buildAggregatedEquityCurve(scope, {
        startDate: range.startDate,
        endDate: range.endDate,
        maxPoints: input.maxPoints,
        strategyIds: [input.strategyId],
      });
      return { points: res.points.map(p => equityPointSchema.parse(p)) };
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
      const scope = { userId: ctx.user.id, workspaceId: ctx.user.workspaceId };
      const result = await buildStrategyComparison({
        ...input,
        userId: scope.userId,
        workspaceId: scope.workspaceId,
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
      const scope = { userId: ctx.user.id, workspaceId: ctx.user.workspaceId };
      return summarySchema.parse(await buildPortfolioSummary(scope, range));
    }),
  trades: authedProcedure
    .input(
      z
        .object({
          timeRange: timeRangeInput,
          page: z.number().int().min(1).default(1),
          pageSize: z.number().int().min(1).max(500).default(50),
          symbol: z.string().trim().min(1).max(24).optional(),
          strategyId: z.number().int().optional(),
          side: z.enum(["long", "short"]).optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const range = deriveDateRangeFromTimeRange(input?.timeRange);
      const scope = { userId: ctx.user.id, workspaceId: ctx.user.workspaceId };
      const page = input?.page ?? 1;
      const pageSize = input?.pageSize ?? 50;
      const result = await loadTradesPage(scope, {
        ...range,
        page,
        pageSize,
        symbol: input?.symbol?.toUpperCase(),
        side: input?.side,
        strategyIds: input?.strategyId ? [input.strategyId] : undefined,
      });
      return {
        rows: result.rows.map(row => tradeRowSchema.parse(row)),
        total: result.total,
        page,
        pageSize,
      };
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
          userId: ctx.user.id,
          workspaceId: ctx.user.workspaceId,
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
        fileName: z.string().optional(),
        strategyName: z.string().optional(),
        strategyType: z.enum(["swing", "intraday"]).optional(),
      }),
    )
    .output(tradeIngestionResultSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        enforceUploadGuards(input.csv, input.fileName);
        const result = await ingestTradesCsv({
          csv: input.csv,
          userId: ctx.user.id,
          workspaceId: ctx.user.workspaceId ?? 1,
          defaultStrategyName: input.strategyName,
          defaultStrategyType: input.strategyType,
          fileName: input.fileName,
        });
        return tradeIngestionResultSchema.parse(result);
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: error instanceof Error ? error.message : "Failed to ingest trades",
        });
      }
    }),
  uploadBenchmarksCsv: authedProcedure
    .input(
      z.object({
        csv: z.string(),
        fileName: z.string().optional(),
        symbol: z.string().optional(),
      }),
    )
    .output(benchmarkIngestionResultSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        enforceUploadGuards(input.csv, input.fileName);
        const result = await ingestBenchmarksCsv({
          csv: input.csv,
          userId: ctx.user.id,
          workspaceId: ctx.user.workspaceId ?? 1,
          fileName: input.fileName,
          defaultSymbol: input.symbol,
        });
        return benchmarkIngestionResultSchema.parse(result);
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: error instanceof Error ? error.message : "Failed to ingest benchmarks",
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
          userId: ctx.user.id,
          workspaceId: ctx.user.workspaceId,
          days: input.days,
          simulations: input.simulations,
          ...deriveDateRangeFromTimeRange(input.timeRange),
        }),
      ),
    ),
});
