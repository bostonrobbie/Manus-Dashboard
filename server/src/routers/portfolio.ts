import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  buildAggregatedEquityCurve,
  buildDrawdownCurves,
  buildPortfolioOverview,
  buildPortfolioSummary,
  buildStrategyComparison,
  buildCustomPortfolio,
  runMonteCarloSimulation,
  loadTradesPage,
  generateTradesCsv,
} from "@server/engine/portfolio-engine";
import { authedProcedure, router } from "@server/trpc/router";
import { ingestTradesCsv } from "@server/services/tradeIngestion";
import { ingestBenchmarksCsv } from "@server/services/benchmarkIngestion";
import { TIME_RANGE_PRESETS, deriveDateRangeFromTimeRange } from "@server/utils/timeRange";
import { env } from "@server/utils/env";
import { requireWorkspaceAccess } from "@server/auth/workspaceAccess";
import type { AuthUser } from "@server/auth/types";

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
const workspaceMetricsSchema = z.object({
  totalReturnPct: finiteNumber,
  cagrPct: finiteNumber,
  volatilityPct: finiteNumber,
  sharpe: finiteNumber,
  sortino: finiteNumber,
  calmar: finiteNumber,
  maxDrawdownPct: finiteNumber,
  winRatePct: finiteNumber,
  lossRatePct: finiteNumber,
  avgWin: finiteNumber,
  avgLoss: finiteNumber,
  payoffRatio: finiteNumber,
  profitFactor: finiteNumber,
  expectancyPerTrade: finiteNumber,
  alpha: finiteNumber.nullable(),
});
const overviewSchema = z.object({
  equity: finiteNumber,
  dailyPnL: finiteNumber,
  dailyReturn: finiteNumber,
  totalReturn: finiteNumber,
  totalReturnPct: finiteNumber.optional(),
  sharpeRatio: finiteNumber,
  sortinoRatio: finiteNumber.optional(),
  cagr: finiteNumber.optional(),
  calmar: finiteNumber.optional(),
  volatility: finiteNumber.optional(),
  maxDrawdown: finiteNumber,
  currentDrawdown: finiteNumber,
  maxDrawdownPct: finiteNumber.optional(),
  totalTrades: z.number().int(),
  winningTrades: z.number().int(),
  losingTrades: z.number().int(),
  winRate: finiteNumber,
  lossRate: finiteNumber.optional(),
  profitFactor: finiteNumber,
  expectancy: finiteNumber.optional(),
  positions: z.number().int(),
  lastUpdated: z.date(),
  metrics: workspaceMetricsSchema.optional(),
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
  sortinoRatio: finiteNumber.optional(),
  cagr: finiteNumber.optional(),
  calmar: finiteNumber.optional(),
  winRatePct: finiteNumber,
  lossRatePct: finiteNumber.optional(),
  totalTrades: z.number().int(),
  profitFactor: finiteNumber,
  expectancy: finiteNumber.optional(),
  payoffRatio: finiteNumber.optional(),
  sparkline: z
    .array(
      z.object({
        date: z.string(),
        value: finiteNumber,
      }),
    )
    .optional(),
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
  initialRisk: finiteNumber.optional(),
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
const customPortfolioContributionSchema = z.object({
  strategyId: z.number().int(),
  name: z.string(),
  weight: z.number(),
  totalReturnPct: finiteNumber,
  maxDrawdownPct: finiteNumber,
  sharpeRatio: finiteNumber,
  tradeCount: z.number().int(),
});

const MAX_UPLOAD_BYTES = env.maxUploadBytes ?? 5 * 1024 * 1024;

const timeRangeInput = z
  .object({
    preset: z.enum(TIME_RANGE_PRESETS),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
  })
  .optional();

const resolveScope = async (ctx: { user: AuthUser }, intent: "read" | "write") => {
  const access = await requireWorkspaceAccess(ctx.user, intent);
  const workspaceId = access.workspace?.id ?? ctx.user.workspaceId;
  if (!workspaceId) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Workspace is required" });
  }
  return { access, workspaceId };
};

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
      const { workspaceId } = await resolveScope(ctx, "read");
      const range = deriveDateRangeFromTimeRange(input?.timeRange);
      const scope = { userId: ctx.user.id, workspaceId };
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
      const { workspaceId } = await resolveScope(ctx, "read");
      const range = deriveDateRangeFromTimeRange(input?.timeRange);
      const scope = { userId: ctx.user.id, workspaceId };
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
      const { workspaceId } = await resolveScope(ctx, "read");
      const range = deriveDateRangeFromTimeRange(input?.timeRange);
      const scope = { userId: ctx.user.id, workspaceId };
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
      const { workspaceId } = await resolveScope(ctx, "read");
      const range = deriveDateRangeFromTimeRange(input.timeRange);
      const scope = { userId: ctx.user.id, workspaceId };
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
            "sortinoRatio",
            "cagr",
            "calmar",
            "winRatePct",
            "lossRatePct",
            "totalTrades",
            "profitFactor",
            "expectancy",
            "payoffRatio",
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
      const { workspaceId } = await resolveScope(ctx, "read");
      const range = deriveDateRangeFromTimeRange(input.timeRange);
      const scope = { userId: ctx.user.id, workspaceId };
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
  customPortfolio: authedProcedure
    .input(
      z
        .object({
          strategyIds: z.array(z.number().int()).nonempty().max(50),
          weights: z.array(z.number()).optional(),
          timeRange: timeRangeInput,
          maxPoints: z.number().int().positive().max(2000).optional(),
        })
        .refine(input => !input.weights || input.weights.length === input.strategyIds.length, {
          message: "weights length must match strategyIds",
        }),
    )
    .mutation(async ({ ctx, input }) => {
      const { workspaceId } = await resolveScope(ctx, "read");
      const range = deriveDateRangeFromTimeRange(input.timeRange);
      const scope = { userId: ctx.user.id, workspaceId };

      const result = await buildCustomPortfolio(scope, {
        strategyIds: input.strategyIds,
        weights: input.weights,
        startDate: range.startDate,
        endDate: range.endDate,
        maxPoints: input.maxPoints,
      });

      return {
        metrics: workspaceMetricsSchema.parse(result.metrics),
        equityCurve: { points: result.equityCurve.points.map(p => equityPointSchema.parse(p)) },
        contributions: result.contributions.map(c => customPortfolioContributionSchema.parse(c)),
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
      const { workspaceId } = await resolveScope(ctx, "read");
      const range = deriveDateRangeFromTimeRange(input?.timeRange);
      const scope = { userId: ctx.user.id, workspaceId };
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
      const { workspaceId } = await resolveScope(ctx, "read");
      const range = deriveDateRangeFromTimeRange(input?.timeRange);
      const scope = { userId: ctx.user.id, workspaceId };
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
        const { workspaceId } = await resolveScope(ctx, "read");
        const range = deriveDateRangeFromTimeRange(input.timeRange);
        const csvString = await generateTradesCsv({
          userId: ctx.user.id,
          workspaceId,
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
        const { workspaceId } = await resolveScope(ctx, "write");
        enforceUploadGuards(input.csv, input.fileName);
        const result = await ingestTradesCsv({
          csv: input.csv,
          userId: ctx.user.id,
          workspaceId: workspaceId ?? 1,
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
        const { workspaceId } = await resolveScope(ctx, "write");
        enforceUploadGuards(input.csv, input.fileName);
        const result = await ingestBenchmarksCsv({
          csv: input.csv,
          userId: ctx.user.id,
          workspaceId: workspaceId ?? 1,
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
        await (async () => {
          const { workspaceId } = await resolveScope(ctx, "read");
          return runMonteCarloSimulation({
            userId: ctx.user.id,
            workspaceId,
            days: input.days,
            simulations: input.simulations,
            ...deriveDateRangeFromTimeRange(input.timeRange),
          });
        })(),
      ),
    ),
});
