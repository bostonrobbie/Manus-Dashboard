import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import {
  getUserByApiKey,
  createTrade,
  getTradeByExternalId,
  updateTrade,
  upsertPosition,
  insertEquityCurve,
  logWebhook,
} from "../db";

/**
 * TradingView Webhook Router
 * 
 * Handles incoming webhooks from TradingView alerts.
 * Supports trade events, position updates, and equity curve updates.
 * 
 * Security: Requires API key authentication
 */

const tradeEventSchema = z.object({
  type: z.literal("trade"),
  externalId: z.string(),
  symbol: z.string(),
  side: z.enum(["buy", "sell", "long", "short"]),
  entryPrice: z.number(),
  entryTime: z.string().or(z.date()),
  quantity: z.number(),
  exitPrice: z.number().optional(),
  exitTime: z.string().or(z.date()).optional(),
  strategyId: z.number().optional(),
  strategyName: z.string().optional(),
  notes: z.string().optional(),
});

const positionEventSchema = z.object({
  type: z.literal("position"),
  symbol: z.string(),
  side: z.enum(["long", "short"]),
  quantity: z.number(),
  entryPrice: z.number(),
  currentPrice: z.number(),
  entryTime: z.string().or(z.date()),
  strategyId: z.number().optional(),
});

const equityEventSchema = z.object({
  type: z.literal("equity"),
  equity: z.number(),
  cash: z.number().optional(),
  positionsValue: z.number().optional(),
  date: z.string().or(z.date()).optional(),
  strategyId: z.number().optional(),
});

const webhookEventSchema = z.discriminatedUnion("type", [
  tradeEventSchema,
  positionEventSchema,
  equityEventSchema,
]);

export const webhooksRouter = router({
  /**
   * Ingest webhook from TradingView
   * 
   * POST /api/trpc/webhooks.ingest
   * 
   * Headers:
   *   X-API-Key: tp_xxxxxxxxxxxxx
   * 
   * Body:
   *   { type: "trade", externalId: "...", symbol: "SPY", ... }
   */
  ingest: publicProcedure
    .input(z.object({
      apiKey: z.string(),
      event: webhookEventSchema,
    }))
    .mutation(async ({ input, ctx }) => {
      const startTime = Date.now();
      const { apiKey, event } = input;

      try {
        // Authenticate user by API key
        const user = await getUserByApiKey(apiKey);
        if (!user) {
          await logWebhook({
            endpoint: "/webhooks/ingest",
            method: "POST",
            payload: JSON.stringify(input),
            response: JSON.stringify({ error: "Invalid API key" }),
            statusCode: 401,
            processingTime: Date.now() - startTime,
            error: "Invalid API key",
          });
          throw new Error("Invalid API key");
        }

        // Process event based on type
        let response: any = {};

        if (event.type === "trade") {
          response = await handleTradeEvent(user.id, event);
        } else if (event.type === "position") {
          response = await handlePositionEvent(user.id, event);
        } else if (event.type === "equity") {
          response = await handleEquityEvent(user.id, event);
        }

        // Log successful webhook
        await logWebhook({
          userId: user.id,
          endpoint: "/webhooks/ingest",
          method: "POST",
          payload: JSON.stringify(input),
          response: JSON.stringify(response),
          statusCode: 200,
          processingTime: Date.now() - startTime,
        });

        return {
          success: true,
          message: "Webhook processed successfully",
          data: response,
        };
      } catch (error: any) {
        // Log failed webhook
        await logWebhook({
          endpoint: "/webhooks/ingest",
          method: "POST",
          payload: JSON.stringify(input),
          response: JSON.stringify({ error: error.message }),
          statusCode: 500,
          processingTime: Date.now() - startTime,
          error: error.message,
        });

        throw error;
      }
    }),

  /**
   * Get webhook logs for debugging
   */
  logs: publicProcedure
    .input(z.object({
      limit: z.number().optional().default(100),
    }))
    .query(async ({ input }) => {
      // For now, return all logs (will add user filtering after auth is implemented)
      const { getWebhookLogs } = await import("../db");
      const logs = await getWebhookLogs(undefined, input.limit);
      return logs;
    }),
});

// ==================== EVENT HANDLERS ====================

async function handleTradeEvent(userId: number, event: z.infer<typeof tradeEventSchema>) {
  // Check if trade already exists (idempotency)
  const existingTrade = await getTradeByExternalId(event.externalId, userId);

  const entryTime = typeof event.entryTime === "string" ? new Date(event.entryTime) : event.entryTime;
  const exitTime = event.exitTime 
    ? (typeof event.exitTime === "string" ? new Date(event.exitTime) : event.exitTime)
    : undefined;

  // Calculate PnL if exit price is provided
  let pnl: string | undefined;
  let pnlPercent: string | undefined;
  let holdingPeriod: number | undefined;

  if (event.exitPrice && exitTime) {
    const entryValue = event.entryPrice * event.quantity;
    const exitValue = event.exitPrice * event.quantity;
    
    if (event.side === "buy" || event.side === "long") {
      pnl = (exitValue - entryValue).toFixed(2);
      pnlPercent = (((event.exitPrice - event.entryPrice) / event.entryPrice) * 100).toFixed(4);
    } else {
      pnl = (entryValue - exitValue).toFixed(2);
      pnlPercent = (((event.entryPrice - event.exitPrice) / event.entryPrice) * 100).toFixed(4);
    }

    holdingPeriod = Math.floor((exitTime.getTime() - entryTime.getTime()) / (1000 * 60)); // minutes
  }

  if (existingTrade) {
    // Update existing trade (e.g., exit event)
    await updateTrade(existingTrade.id, userId, {
      exitPrice: event.exitPrice?.toString(),
      exitTime,
      pnl,
      pnlPercent,
      holdingPeriod,
      notes: event.notes,
    });

    return {
      action: "updated",
      tradeId: existingTrade.id,
      externalId: event.externalId,
    };
  } else {
    // Create new trade
    await createTrade({
      userId,
      strategyId: event.strategyId,
      externalId: event.externalId,
      symbol: event.symbol,
      side: event.side,
      entryPrice: event.entryPrice.toString(),
      entryTime,
      quantity: event.quantity.toString(),
      exitPrice: event.exitPrice?.toString(),
      exitTime,
      pnl,
      pnlPercent,
      holdingPeriod,
      notes: event.notes,
    });

    return {
      action: "created",
      externalId: event.externalId,
    };
  }
}

async function handlePositionEvent(userId: number, event: z.infer<typeof positionEventSchema>) {
  const entryTime = typeof event.entryTime === "string" ? new Date(event.entryTime) : event.entryTime;

  // Calculate unrealized PnL
  const entryValue = event.entryPrice * event.quantity;
  const currentValue = event.currentPrice * event.quantity;
  
  let unrealizedPnL: string;
  let unrealizedPnLPercent: string;

  if (event.side === "long") {
    unrealizedPnL = (currentValue - entryValue).toFixed(2);
    unrealizedPnLPercent = (((event.currentPrice - event.entryPrice) / event.entryPrice) * 100).toFixed(4);
  } else {
    unrealizedPnL = (entryValue - currentValue).toFixed(2);
    unrealizedPnLPercent = (((event.entryPrice - event.currentPrice) / event.entryPrice) * 100).toFixed(4);
  }

  await upsertPosition({
    userId,
    strategyId: event.strategyId,
    symbol: event.symbol,
    side: event.side,
    quantity: event.quantity.toString(),
    entryPrice: event.entryPrice.toString(),
    currentPrice: event.currentPrice.toString(),
    unrealizedPnL,
    unrealizedPnLPercent,
    entryTime,
  });

  return {
    action: "upserted",
    symbol: event.symbol,
    unrealizedPnL,
  };
}

async function handleEquityEvent(userId: number, event: z.infer<typeof equityEventSchema>) {
  const date = event.date 
    ? (typeof event.date === "string" ? new Date(event.date) : event.date)
    : new Date();

  await insertEquityCurve({
    userId,
    strategyId: event.strategyId,
    date,
    equity: event.equity.toString(),
    cash: event.cash?.toString(),
    positionsValue: event.positionsValue?.toString(),
  });

  return {
    action: "inserted",
    equity: event.equity,
    date: date.toISOString(),
  };
}
