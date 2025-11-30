import express from "express";
import cors from "cors";
import * as trpcExpress from "@trpc/server/adapters/express";

import { createContext } from "./trpc/context";
import { appRouter } from "./routers";
import { runBasicHealthCheck, runFullHealthCheck } from "./health";
import { createLogger } from "./utils/logger";
import { getVersionInfo } from "./version";

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
