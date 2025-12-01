import express from "express";
import cors from "cors";
import * as trpcExpress from "@trpc/server/adapters/express";
import { eq } from "drizzle-orm";

import { createContext } from "./trpc/context";
import { appRouter } from "./routers";
import { runBasicHealthCheck, runFullHealthCheck } from "./health";
import { createLogger } from "./utils/logger";
import { getVersionInfo } from "./version";
import { ingestWebhookTrade } from "./services/tradeIngestion";
import { getDb, schema } from "./db";

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
    const configuredSecret = process.env.TRADINGVIEW_WEBHOOK_SECRET;
    if (!configuredSecret) {
      logger.warn("TradingView webhook secret not configured");
      return res.status(503).json({ status: "error", message: "Webhook secret not configured" });
    }

    const providedSecret = (req.headers["x-webhook-secret"] as string | undefined) ?? (req.query.secret as string | undefined);
    if (!providedSecret || providedSecret !== configuredSecret) {
      return res.status(401).json({ status: "unauthorized" });
    }

    const payload = req.body ?? {};
    const workspaceKey = payload.workspace_key ?? payload.workspace_id ?? payload.workspaceId;
    const strategyKey = payload.strategy_key ?? payload.strategy_id ?? payload.strategyId;
    const strategyType =
      payload.strategy_type === "intraday" ? "intraday" : payload.strategy_type === "swing" ? "swing" : undefined;

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

    const result = await ingestWebhookTrade({
      userId,
      workspaceId: workspaceRow.id,
      uploadLabel: payload.alert_name ?? payload.alertName ?? payload.fileName,
      trade: {
        strategyId: typeof strategyKey === "number" ? strategyKey : undefined,
        strategyName: typeof strategyKey === "string" ? strategyKey : undefined,
        strategyType,
        symbol: payload.symbol,
        side: payload.side,
        quantity: Number(payload.quantity),
        executionPrice: Number(payload.execution_price ?? payload.price ?? payload.close),
        timestamp: payload.timestamp ?? payload.time ?? payload.ts ?? Date.now(),
        externalId: payload.external_id ?? payload.id,
        notes: payload.comment ?? payload.notes,
      },
    });

    if (!result.inserted) {
      return res.status(400).json({ status: "error", errors: result.errors ?? ["Unable to ingest trade"] });
    }

    return res.json({
      status: "ok",
      uploadId: result.uploadId,
      naturalKey: result.naturalKey,
      strategyId: result.strategyId,
      externalId: result.externalId,
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
