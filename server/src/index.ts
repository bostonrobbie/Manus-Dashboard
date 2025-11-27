import express from "express";
import cors from "cors";
import * as trpcExpress from "@trpc/server/adapters/express";
import { sql } from "drizzle-orm";
import { getDb } from "./db";
import { createContext } from "./trpc/context";
import { appRouter } from "./routers";
import { env } from "./utils/env";

const app = express();
app.use(cors());
app.use(express.json());

// Lightweight readiness probe with DB connectivity signal
app.get("/health", async (_req, res) => {
  const HEALTH_TIMEOUT_MS = 3000;
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error("health check timed out")), HEALTH_TIMEOUT_MS),
  );

  try {
    const db = await getDb();
    if (!db) throw new Error("database not configured");

    await Promise.race([db.execute(sql`select 1`), timeoutPromise]);
    return res.json({ status: "ok", db: "up" });
  } catch (error) {
    console.error("[health] database check failed", error);
  }

  res.status(503).json({ status: "degraded", db: "down" });
});

app.use(
  "/trpc",
  trpcExpress.createExpressMiddleware({
    router: appRouter,
    createContext,
  })
);

const port = env.port;
const host = "0.0.0.0";

app.listen(port, host, () => {
  console.log(`[server] listening on http://${host}:${port}`);
});

export type { AppRouter } from "./routers";
