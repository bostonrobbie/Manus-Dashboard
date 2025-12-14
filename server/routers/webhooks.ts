import type { Request, Response } from "express";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";

import { getDb, schema } from "../db";
import { captureException } from "../monitoring/monitor";
import { protectedProcedure, requireUser, router } from "../_core/trpc";
import { createLogger } from "../utils/logger";

const logger = createLogger("webhooks");
const WEBHOOK_ENDPOINT = "webhooks.tradingview";

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

async function resolveStrategyId(db: NonNullable<Awaited<ReturnType<typeof getDb>>>, userId: number, payload: TradingViewPayload) {
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
  let db = null as Awaited<ReturnType<typeof getDb>>;
  const eventPayload = req.body ?? {};
  const providedSecret = (req.headers["x-webhook-secret"] as string | undefined)?.trim();
  const configuredSecret = process.env.TRADINGVIEW_WEBHOOK_SECRET;
  // TODO: add per-IP or per-secret rate limiting to harden the webhook surface.

  const userId = DEFAULT_WEBHOOK_USER_ID;
  const logAndRespond = async (
    status: number,
    errorMessage: string,
    payload: unknown = eventPayload,
    error?: unknown,
  ) => {
    const err = error instanceof Error ? error : errorMessage ? new Error(errorMessage) : undefined;
    logger.error("TradingView webhook error", {
      endpoint: WEBHOOK_ENDPOINT,
      userId,
      message: err?.message ?? errorMessage,
      stack: err?.stack,
      timestamp: new Date().toISOString(),
    });
    captureException(err ?? new Error(errorMessage), { endpoint: WEBHOOK_ENDPOINT, userId });
    const dbForLog = db ?? (await getDb());
    if (dbForLog) {
      await recordWebhookLog({
        db: dbForLog,
        userId,
        payload,
        status: "error",
        errorMessage,
      });
    }
    return res.status(status).json({ success: false, error: errorMessage });
  };

  if (!configuredSecret) {
    return logAndRespond(503, "Webhook secret not configured");
  }

  if (!providedSecret || providedSecret !== configuredSecret) {
    return logAndRespond(403, "Invalid webhook secret");
  }

  const parsed = tradingViewPayloadSchema.safeParse(eventPayload);
  if (!parsed.success) {
    const message = parsed.error.issues.map(issue => issue.message).join("; ") || "Invalid payload";
    return logAndRespond(400, message);
  }

  db = await getDb();
  if (!db) {
    return logAndRespond(503, "Database not configured");
  }

  const payload = parsed.data;

  try {
    const strategyId = await resolveStrategyId(db, userId, payload);
    if (!strategyId) {
      return logAndRespond(400, "strategyId or strategyName is required", payload);
    }

    const normalizedSide = payload.side === "buy" ? "long" : payload.side === "sell" ? "short" : payload.side;
    const entryPrice = payload.entryPrice ?? payload.price;
    const exitPrice = payload.exitPrice ?? payload.price ?? entryPrice;
    const entryTime = extractDate(payload.entryTime ?? payload.timestamp);
    const exitTime = extractDate(payload.exitTime ?? payload.timestamp ?? payload.entryTime);

    if (entryPrice == null || exitPrice == null || !entryTime || !exitTime) {
      return logAndRespond(400, "entryPrice, exitPrice, entryTime, and exitTime are required", payload);
    }

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
    return logAndRespond(500, message, payload, error);
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
