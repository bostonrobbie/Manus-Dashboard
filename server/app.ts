import express from "express";
import cors from "cors";
import * as trpcExpress from "@trpc/server/adapters/express";
import { createContext } from "./_core/context";
import { appRouter } from "./routers";
import { runBasicHealthCheck, runFullHealthCheck } from "./health";
import { createLogger } from "./utils/logger";
import { getVersionInfo } from "./version";
import { TRPCError } from "@trpc/server";
import { getHTTPStatusCodeFromError } from "@trpc/server/http";

import { handleTradingViewWebhook } from "./routers/webhooks";

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

  app.post("/api/webhook/tradingview", handleTradingViewWebhook);
  app.post("/webhooks/tradingview", handleTradingViewWebhook);

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
