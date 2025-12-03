import express from "express";
import cors from "cors";
import * as trpcExpress from "@trpc/server/adapters/express";
import { createContext } from "./_core/context";
import { appRouter } from "./routers";
import { runBasicHealthCheck, runFullHealthCheck } from "./health";
import { createLogger } from "./utils/logger";
import { getVersionInfo } from "./version";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { getHTTPStatusCodeFromError } from "@trpc/server/http";

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

  const postProxyHandlers: Record<
    string,
    (caller: ReturnType<typeof appRouter.createCaller>, input: unknown) => Promise<unknown>
  > = {
    "portfolio.getOverview": (caller, input) => caller.portfolio.getOverview(input as any),
    "portfolio.getEquityCurve": (caller, input) => caller.portfolio.getEquityCurve(input as any),
    "portfolio.getPositions": (caller, input) => caller.portfolio.getPositions(input as any),
    "portfolio.getAnalytics": (caller, input) => caller.portfolio.getAnalytics(input as any),
    "webhooks.getLogs": (caller, input) => caller.webhooks.getLogs(input as any),
  };

  app.post("/trpc/:path", async (req, res, next) => {
    const handler = postProxyHandlers[req.params.path];
    if (!handler) return next();

    try {
      const ctx = await createContext({ req, res } as any);
      const caller = appRouter.createCaller(ctx);
      const data = await handler(caller, req.body ?? {});
      return res.json({ result: { data } });
    } catch (error) {
      logger.error("tRPC POST proxy failed", {
        path: req.params.path,
        error: error instanceof Error ? error.message : String(error),
      });
      const status = error instanceof TRPCError ? error.code : "INTERNAL_SERVER_ERROR";
      const httpStatus = error instanceof TRPCError ? getHTTPStatusCodeFromError(error) ?? 500 : 500;
      return res.status(httpStatus).json({ error: { message: status } });
    }
  });

  app.post("/webhooks/tradingview", async (req, res) => {
    const webhookPayloadSchema = z.object({
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
    const strategyKey = payload.strategy_key ?? payload.strategy_id ?? payload.strategyId;
    const strategyType = payload.strategy_type;
    const userId = 1;

    const executionPrice = payload.execution_price ?? payload.price ?? payload.close;
    const timestamp = payload.timestamp ?? payload.time ?? payload.ts;
    if (executionPrice == null || timestamp == null) {
      return res
        .status(400)
        .json({ status: "error", message: "execution_price and timestamp are required for ingestion" });
    }

    const result = await ingestTradeFromWebhook({
      userId,
      uploadLabel: payload.alert_name ?? payload.alertName ?? payload.fileName,
      payload: {
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
