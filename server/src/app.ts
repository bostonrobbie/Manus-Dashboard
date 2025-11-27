import express from "express";
import cors from "cors";
import * as trpcExpress from "@trpc/server/adapters/express";
import { sql } from "drizzle-orm";
import { getDb } from "./db";
import { createContext } from "./trpc/context";
import { appRouter } from "./routers";

type MinimalDb = { execute: (query: any) => Promise<any> } | null;

export async function runHealthCheck(getDbImpl: () => Promise<MinimalDb> = getDb) {
  const HEALTH_TIMEOUT_MS = 3000;
  let timer: NodeJS.Timeout | undefined;
  const timeoutPromise = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error("health check timed out")), HEALTH_TIMEOUT_MS);
  });

  try {
    const db = await getDbImpl();
    if (!db) throw new Error("database not configured");

    await Promise.race([db.execute(sql`select 1`), timeoutPromise]);
    return { status: 200, body: { status: "ok", db: "up" as const } };
  } catch (error) {
    console.warn("[health] degraded", { error: (error as Error).message });
    return { status: 503, body: { status: "degraded", db: "down" as const } };
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export function createServer(getDbImpl: () => Promise<MinimalDb> = getDb) {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get("/health", async (_req, res) => {
    const result = await runHealthCheck(getDbImpl);
    return res.status(result.status).json(result.body);
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
