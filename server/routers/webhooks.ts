import type { Request, Response } from "express";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";

import { getDb, schema } from "../db";
import { protectedProcedure, requireUser, router } from "../_core/trpc";
import { createLogger } from "../utils/logger";

const logger = createLogger("webhooks");

const tradingViewPayloadSchema = z.object({
  strategyId: z.coerce.number().int().optional(),
  strategyName: z.string().min(1).optional(),
  strategy: z.string().min(1).optional(),
  strategyType: z.enum(["intraday", "swing"]).optional(),
  symbol: z.string().min(1),
  side: z.enum(["long", "short", "buy", "sell"]),
  action: z.enum(["entry", "exit"]).optional(),
  quantity: z.coerce.number(),
  price: z.coerce.number().optional(),
  entryPrice: z.coerce.number().optional(),
  exitPrice: z.coerce.number().optional(),
  entryTime: z.union([z.coerce.date(), z.string(), z.number()]).optional(),
  exitTime: z.union([z.coerce.date(), z.string(), z.number()]).optional(),
  timestamp: z.union([z.coerce.date(), z.string(), z.number()]).optional(),
  alertId: z.string().optional(),
  note: z.string().optional(),
});

type TradingViewPayload = z.infer<typeof tradingViewPayloadSchema>;

const DEFAULT_WEBHOOK_USER_ID = Number(process.env.TRADINGVIEW_WEBHOOK_USER_ID ?? 1);

const webhookLogSchema = z.object({
  id: z.number().int(),
  source: z.string(),
  event: z.string(),
  status: z.enum(["success", "error", "pending"]),
  errorMessage: z.string().nullable(),
  payload: z.string().nullable(),
  processedAt: z.string().nullable(),
  createdAt: z.string(),
});

const extractDate = (value?: TradingViewPayload["timestamp"]): Date | null => {
  if (value == null) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

async function recordWebhookLog(params: {
  db: Awaited<ReturnType<typeof getDb>>;
  userId: number;
  payload: unknown;
  status: "success" | "error" | "pending";
  event?: string;
  errorMessage?: string | null;
}) {
  if (!params.db) return;
  const payload = (() => {
    try {
      return JSON.stringify(params.payload);
    } catch {
      return String(params.payload);
    }
  })();

  await params.db.insert(schema.webhookLogs).values({
    userId: params.userId,
    source: "tradingview",
    event: params.event ?? "trade_signal",
    status: params.status,
    payload,
    errorMessage: params.errorMessage ?? null,
    processedAt: params.status === "success" ? new Date() : null,
  });
}

async function resolveStrategyId(db: Awaited<ReturnType<typeof getDb>>, userId: number, payload: TradingViewPayload) {
  const strategyIdCandidate = payload.strategyId;
  const strategyName = payload.strategyName ?? payload.strategy;

  if (strategyIdCandidate != null) return strategyIdCandidate;
  if (!strategyName) return null;

  const [existing] = await db
    .select({
      id: schema.strategies.id,
    })
    .from(schema.strategies)
    .where(and(eq(schema.strategies.name, strategyName), eq(schema.strategies.userId, userId)))
    .limit(1);

  if (existing?.id) return existing.id;

  const insertResult = await db.insert(schema.strategies).values({
    userId,
    name: strategyName,
    type: payload.strategyType ?? "intraday",
    description: "Created via TradingView webhook",
  });

  if (insertResult && typeof (insertResult as any).insertId === "number") {
    return (insertResult as any).insertId as number;
  }

  const [created] = await db
    .select({ id: schema.strategies.id })
    .from(schema.strategies)
    .where(and(eq(schema.strategies.name, strategyName), eq(schema.strategies.userId, userId)))
    .limit(1);

  return created?.id ?? null;
}

export async function handleTradingViewWebhook(req: Request, res: Response) {
  const db = await getDb();
  const eventPayload = req.body ?? {};
  const providedSecret = (req.headers["x-webhook-secret"] as string | undefined)?.trim();
  const configuredSecret = process.env.TRADINGVIEW_WEBHOOK_SECRET;
  // TODO: add per-IP or per-secret rate limiting to harden the webhook surface.

  if (!configuredSecret) {
    logger.error("TradingView webhook secret not configured");
    await recordWebhookLog({
      db,
      userId: DEFAULT_WEBHOOK_USER_ID,
      payload: eventPayload,
      status: "error",
      errorMessage: "Webhook secret not configured",
    });
    return res.status(503).json({ success: false, error: "Webhook secret not configured" });
  }

  if (!providedSecret || providedSecret !== configuredSecret) {
    await recordWebhookLog({
      db,
      userId: DEFAULT_WEBHOOK_USER_ID,
      payload: eventPayload,
      status: "error",
      errorMessage: "Invalid webhook secret",
    });
    return res.status(403).json({ success: false, error: "Invalid webhook secret" });
  }

  const parsed = tradingViewPayloadSchema.safeParse(eventPayload);
  if (!parsed.success) {
    const message = parsed.error.issues.map(issue => issue.message).join("; ") || "Invalid payload";
    logger.warn("TradingView webhook payload failed validation", { message });
    await recordWebhookLog({
      db,
      userId: DEFAULT_WEBHOOK_USER_ID,
      payload: eventPayload,
      status: "error",
      errorMessage: message,
    });
    return res.status(400).json({ success: false, error: message });
  }

  if (!db) {
    await recordWebhookLog({
      db,
      userId: DEFAULT_WEBHOOK_USER_ID,
      payload: eventPayload,
      status: "error",
      errorMessage: "Database not configured",
    });
    return res.status(503).json({ success: false, error: "Database not configured" });
  }

  const payload = parsed.data;
  const userId = DEFAULT_WEBHOOK_USER_ID;

  const strategyId = await resolveStrategyId(db, userId, payload);
  if (!strategyId) {
    await recordWebhookLog({
      db,
      userId,
      payload,
      status: "error",
      errorMessage: "Unable to resolve strategy from payload",
    });
    return res.status(400).json({ success: false, error: "strategyId or strategyName is required" });
  }

  const normalizedSide = payload.side === "buy" ? "long" : payload.side === "sell" ? "short" : payload.side;
  const entryPrice = payload.entryPrice ?? payload.price;
  const exitPrice = payload.exitPrice ?? payload.price ?? entryPrice;
  const entryTime = extractDate(payload.entryTime ?? payload.timestamp);
  const exitTime = extractDate(payload.exitTime ?? payload.timestamp ?? payload.entryTime);

  if (entryPrice == null || exitPrice == null || !entryTime || !exitTime) {
    const errorMessage = "entryPrice, exitPrice, entryTime, and exitTime are required";
    await recordWebhookLog({
      db,
      userId,
      payload,
      status: "error",
      errorMessage,
    });
    return res.status(400).json({ success: false, error: errorMessage });
  }

  try {
    await db.insert(schema.trades).values({
      userId,
      strategyId,
      symbol: payload.symbol,
      side: normalizedSide,
      quantity: payload.quantity.toString(),
      entryPrice: entryPrice.toString(),
      exitPrice: exitPrice.toString(),
      entryTime,
      exitTime,
      externalId: payload.alertId,
      naturalKey: `${strategyId}-${payload.symbol}-${entryTime.toISOString()}-${normalizedSide}`,
    });

    await recordWebhookLog({
      db,
      userId,
      payload,
      status: "success",
      event: payload.action ?? "trade_signal",
    });

    return res.status(200).json({ status: "ok", success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to insert trade";
    logger.error("TradingView webhook failed", { message });
    await recordWebhookLog({
      db,
      userId,
      payload,
      status: "error",
      errorMessage: message,
    });
    return res.status(500).json({ success: false, error: message });
  }
}

export const webhooksRouter = router({
  getLogs: protectedProcedure
    .input(z.object({ limit: z.number().int().min(1).max(200).default(50) }).optional())
    .output(z.object({ logs: z.array(webhookLogSchema) }))
    .mutation(async ({ ctx, input }) => {
      const user = requireUser(ctx as any);
      const db = await getDb();
      if (!db) return { logs: [] };

      const limit = input?.limit ?? 50;
      const rows = await db
        .select({
          id: schema.webhookLogs.id,
          source: schema.webhookLogs.source,
          event: schema.webhookLogs.event,
          status: schema.webhookLogs.status,
          errorMessage: schema.webhookLogs.errorMessage,
          payload: schema.webhookLogs.payload,
          processedAt: schema.webhookLogs.processedAt,
          createdAt: schema.webhookLogs.createdAt,
        })
        .from(schema.webhookLogs)
        .where(eq(schema.webhookLogs.userId, user.id))
        .orderBy(desc(schema.webhookLogs.createdAt))
        .limit(limit);

      return {
        logs: rows.map(row => ({
          id: row.id,
          source: row.source ?? "tradingview",
          event: row.event ?? "unknown",
          status: row.status,
          errorMessage: row.errorMessage ?? null,
          payload: row.payload ?? null,
          processedAt: row.processedAt ? row.processedAt.toISOString?.() ?? String(row.processedAt) : null,
          createdAt: row.createdAt ? row.createdAt.toISOString?.() ?? String(row.createdAt) : new Date().toISOString(),
        })),
      };
    }),
});
