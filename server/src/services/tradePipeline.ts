import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { ingestTradesCsv, ingestWebhookTrade } from "@server/services/tradeIngestion";
import type { IngestTradesOptions, WebhookTrade } from "@server/services/tradeIngestion";
import { createLogger } from "@server/utils/logger";
import {
  buildCustomPortfolio,
  buildPortfolioOverview,
  buildPortfolioSummary,
  buildStrategyComparison,
  generateTradesCsv,
  loadTradesPage,
} from "@server/engine/portfolio-engine";
import { deriveDateRangeFromTimeRange } from "@server/utils/timeRange";
import type { StrategyType, TimeRange, StrategyComparisonRow } from "@shared/types/portfolio";

const logger = createLogger("trade-pipeline");

export interface CsvIngestionParams extends Omit<IngestTradesOptions, "userId"> {
  userId: number;
}

export async function ingestTradesFromCsv(params: CsvIngestionParams) {
  const result = await ingestTradesCsv(params);
  const duplicateCount = Math.max(0, result.skippedCount - result.failedCount);
  logger.info("Trade pipeline CSV ingestion", {
    eventName: "PIPELINE_INGEST_TRADES_CSV",
    userId: params.userId,
    uploadId: result.uploadId,
    insertedCount: result.importedCount,
    duplicateCount,
    warningsCount: result.warnings.length,
  });

  return {
    uploadId: result.uploadId,
    insertedCount: result.importedCount,
    duplicateCount,
    skippedCount: result.skippedCount,
    failedCount: result.failedCount,
    errors: result.errors,
    warnings: result.warnings,
  };
}

const webhookSchema = z.object({
  strategyKey: z.union([z.string(), z.number()]).optional(),
  strategyType: z.enum(["swing", "intraday"]).optional(),
  symbol: z.string().min(1),
  side: z.string(),
  quantity: z.number(),
  executionPrice: z.number(),
  timestamp: z.union([z.number(), z.string()]),
  externalId: z.string().optional(),
  note: z.string().optional(),
});

export type WebhookIngestionInput = z.infer<typeof webhookSchema>;

export async function ingestTradeFromWebhook(params: {
  userId: number;
  uploadLabel?: string;
  payload: WebhookIngestionInput;
}) {
  const parsed = webhookSchema.safeParse({
    strategyKey: params.payload.strategyKey,
    strategyType: params.payload.strategyType,
    symbol: params.payload.symbol,
    side: params.payload.side,
    quantity: params.payload.quantity,
    executionPrice: params.payload.executionPrice,
    timestamp: params.payload.timestamp,
    externalId: params.payload.externalId,
    note: params.payload.note,
  });

  if (!parsed.success) {
    const message = parsed.error.issues.map(issue => issue.message).join("; ") || "Invalid webhook payload";
    logger.warn("Webhook payload failed validation", { errors: message });
    return { uploadId: undefined, status: "skipped" as const, message };
  }

  const result = await ingestWebhookTrade({
    userId: params.userId,
    uploadLabel: params.uploadLabel ?? "tradingview-webhook",
    trade: normalizeWebhookTrade(parsed.data),
  });

  logger.info("Trade pipeline webhook ingestion", {
    eventName: "PIPELINE_INGEST_TRADES_WEBHOOK",
    uploadId: result.uploadId,
    status: result.inserted ? "inserted" : "duplicate",
    externalId: parsed.data.externalId,
  });

  return {
    uploadId: result.uploadId,
    status: result.inserted ? (result.errors?.length ? "skipped" : "inserted") : "duplicate",
    message: result.errors?.[0],
    naturalKey: result.naturalKey,
    externalId: result.externalId,
  };
}

function normalizeWebhookTrade(payload: WebhookIngestionInput): WebhookTrade {
  const normalizedSide = (() => {
    const side = payload.side.toLowerCase();
    if (side === "buy" || side === "long") return "long";
    if (side === "sell" || side === "short") return "short";
    return payload.side;
  })();

  return {
    strategyId: typeof payload.strategyKey === "number" ? payload.strategyKey : undefined,
    strategyName: typeof payload.strategyKey === "string" ? payload.strategyKey : undefined,
    strategyType: payload.strategyType as StrategyType | undefined,
    symbol: payload.symbol,
    side: normalizedSide,
    quantity: payload.quantity,
    executionPrice: payload.executionPrice,
    timestamp: payload.timestamp,
    externalId: payload.externalId,
    notes: payload.note,
  };
}

export async function getPortfolioOverview(params: { userId: number; timeRange?: TimeRange }) {
  const range = deriveDateRangeFromTimeRange(params.timeRange);
  return buildPortfolioOverview({ userId: params.userId }, { startDate: range.startDate, endDate: range.endDate });
}

export async function getStrategyAnalytics(params: {
  userId: number;
  input: {
    page?: number;
    pageSize?: number;
    sortBy?: keyof StrategyComparisonRow;
    sortOrder?: "asc" | "desc";
    filterType?: "all" | "swing" | "intraday";
    search?: string;
    timeRange?: TimeRange;
    startDate?: string;
    endDate?: string;
  };
}) {
  const range = deriveDateRangeFromTimeRange(params.input.timeRange);
  return buildStrategyComparison({
    ...params.input,
    userId: params.userId,
    page: params.input.page ?? 1,
    pageSize: params.input.pageSize ?? 10,
    sortBy: (params.input.sortBy ?? "totalReturn") as keyof StrategyComparisonRow,
    sortOrder: params.input.sortOrder ?? "desc",
    filterType: params.input.filterType ?? "all",
    startDate: params.input.startDate ?? range.startDate,
    endDate: params.input.endDate ?? range.endDate,
});
}

export async function getCustomPortfolioAnalytics(params: {
  userId: number;
  strategyIds: number[];
  weights?: number[];
  timeRange?: TimeRange;
  maxPoints?: number;
}) {
  const range = deriveDateRangeFromTimeRange(params.timeRange);
  return buildCustomPortfolio(
    { userId: params.userId },
    {
      strategyIds: params.strategyIds,
      weights: params.weights,
      startDate: range.startDate,
      endDate: range.endDate,
      maxPoints: params.maxPoints,
    },
  );
}

export async function getPortfolioTrades(params: {
  userId: number;
  timeRange?: TimeRange;
  page?: number;
  pageSize?: number;
  symbol?: string;
  side?: "long" | "short";
  strategyId?: number;
}) {
  const range = deriveDateRangeFromTimeRange(params.timeRange);
  return loadTradesPage(
    { userId: params.userId },
    {
      ...range,
      page: params.page ?? 1,
      pageSize: params.pageSize ?? 50,
      symbol: params.symbol,
      side: params.side,
      strategyIds: params.strategyId ? [params.strategyId] : undefined,
    },
  );
}

export async function getPortfolioSummaryCsv(params: {
  userId: number;
  strategyIds?: number[];
  timeRange?: TimeRange;
  startDate?: string;
  endDate?: string;
}) {
  const range = deriveDateRangeFromTimeRange(params.timeRange);
  try {
    return await generateTradesCsv({
      userId: params.userId,
      strategyIds: params.strategyIds,
      startDate: params.startDate ?? range.startDate,
      endDate: params.endDate ?? range.endDate,
    });
  } catch (error) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: error instanceof Error ? error.message : "Failed to export trades",
    });
  }
}

export async function getPortfolioSummaryMetrics(params: { userId: number; timeRange?: TimeRange }) {
  const range = deriveDateRangeFromTimeRange(params.timeRange);
  return buildPortfolioSummary(
    { userId: params.userId },
    range,
  );
}
