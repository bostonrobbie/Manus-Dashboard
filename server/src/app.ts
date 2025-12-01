import express from "express";
import cors from "cors";
import * as trpcExpress from "@trpc/server/adapters/express";
import { eq } from "drizzle-orm";

import { createContext } from "./trpc/context";
import { appRouter } from "./routers";
import { runBasicHealthCheck, runFullHealthCheck } from "./health";
import { createLogger } from "./utils/logger";
import { getVersionInfo } from "./version";
import { z } from "zod";

import { getDb, schema } from "./db";
import { ingestTradeFromWebhook } from "./services/tradePipeline";

export function createServer() {
  const app = express();
  const logger = createLogger("app");
  const versionInfo = getVersionInfo();
  app.use(cors());
  app.use(express.json());

  app.get("/health", async (_req, res) => {
    const result = await runBasicHealthCheck();
    return res.status(result.status).json(result.body);
  });

  app.get("/health/full", async (_req, res) => {
    const result = await runFullHealthCheck();
    if (result.status !== 200) {
      logger.warn("Full health check reported issues", { status: result.status, details: result.body.details });
    }
    return res.status(result.status).json(result.body);
  });

  app.get("/version", (_req, res) => {
    return res.json(versionInfo);
  });

  app.post("/webhooks/tradingview", async (req, res) => {
    const webhookPayloadSchema = z.object({
      workspace_key: z.union([z.string(), z.number()]).optional(),
      workspace_id: z.union([z.string(), z.number()]).optional(),
      workspaceId: z.union([z.string(), z.number()]).optional(),
      strategy_key: z.union([z.string(), z.number()]).optional(),
      strategy_id: z.union([z.string(), z.number()]).optional(),
      strategyId: z.union([z.string(), z.number()]).optional(),
      strategy_type: z.enum(["intraday", "swing"]).optional(),
      symbol: z.string().min(1),
      side: z.enum(["long", "short", "buy", "sell"]),
      quantity: z.coerce.number(),
      execution_price: z.coerce.number().optional(),
      price: z.coerce.number().optional(),
      close: z.coerce.number().optional(),
      timestamp: z.union([z.string(), z.number()]).optional(),
      time: z.union([z.string(), z.number()]).optional(),
      ts: z.union([z.string(), z.number()]).optional(),
      external_id: z.string().optional(),
      id: z.string().optional(),
      notes: z.string().optional(),
      comment: z.string().optional(),
      alert_name: z.string().optional(),
      alertName: z.string().optional(),
      fileName: z.string().optional(),
    });

    const configuredSecret = process.env.TRADINGVIEW_WEBHOOK_SECRET;
    if (!configuredSecret) {
      logger.warn("TradingView webhook secret not configured");
      return res.status(503).json({ status: "error", message: "Webhook secret not configured" });
    }

    const providedSecret = (req.headers["x-webhook-secret"] as string | undefined) ?? (req.query.secret as string | undefined);
    if (!providedSecret || providedSecret !== configuredSecret) {
      return res.status(401).json({ status: "unauthorized" });
    }

    const parseResult = webhookPayloadSchema.safeParse(req.body ?? {});
    if (!parseResult.success) {
      const message = parseResult.error.issues.map(issue => issue.message).join("; ") || "Invalid payload";
      logger.warn("TradingView webhook validation failed", { message });
      return res.status(400).json({ status: "error", message });
    }

    const payload = parseResult.data;
    const workspaceKey = payload.workspace_key ?? payload.workspace_id ?? payload.workspaceId;
    const strategyKey = payload.strategy_key ?? payload.strategy_id ?? payload.strategyId;
    const strategyType = payload.strategy_type;

    const db = await getDb();
    if (!db) {
      return res.status(503).json({ status: "error", message: "Database not configured" });
    }

    const workspaceRow = workspaceKey
      ? typeof workspaceKey === "number"
        ? await db
            .select({
              id: schema.workspaces.id,
              ownerUserId: schema.workspaces.ownerUserId,
              externalId: schema.workspaces.externalId,
            })
            .from(schema.workspaces)
            .where(eq(schema.workspaces.id, workspaceKey as number))
            .then(rows => rows[0])
        : await db
            .select({
              id: schema.workspaces.id,
              ownerUserId: schema.workspaces.ownerUserId,
              externalId: schema.workspaces.externalId,
            })
            .from(schema.workspaces)
            .where(eq(schema.workspaces.externalId, String(workspaceKey)))
            .then(rows => rows[0])
      : null;

    if (!workspaceRow) {
      return res.status(400).json({ status: "error", message: "Workspace not found" });
    }

    const userId = workspaceRow.ownerUserId ?? 1;

    const executionPrice = payload.execution_price ?? payload.price ?? payload.close;
    const timestamp = payload.timestamp ?? payload.time ?? payload.ts;
    if (executionPrice == null || timestamp == null) {
      return res
        .status(400)
        .json({ status: "error", message: "execution_price and timestamp are required for ingestion" });
    }

    const resolvedWorkspaceKey = workspaceKey ?? workspaceRow.externalId ?? workspaceRow.id;
    const result = await ingestTradeFromWebhook({
      userId,
      ownerId: userId,
      workspaceId: workspaceRow.id,
      uploadLabel: payload.alert_name ?? payload.alertName ?? payload.fileName,
      payload: {
        workspaceKey: resolvedWorkspaceKey,
        strategyKey,
        strategyType,
        symbol: payload.symbol,
        side: payload.side,
        quantity: Number(payload.quantity),
        executionPrice: Number(executionPrice),
        timestamp,
        externalId: payload.external_id ?? payload.id,
        note: payload.comment ?? payload.notes,
      },
    });

    const statusCode = result.status === "skipped" ? 400 : 200;
    return res.status(statusCode).json({
      status: result.status,
      uploadId: result.uploadId,
      naturalKey: result.naturalKey,
      strategyId: strategyKey,
      externalId: result.externalId,
      message: result.message,
    });
  });

  app.use(
    "/trpc",
    trpcExpress.createExpressMiddleware({
      router: appRouter,
      createContext,
    }),
  );

  return app;
}

export type { AppRouter } from "./routers";
