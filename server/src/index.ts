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
  try {
    const db = await getDb();
    if (db) {
      await db.execute(sql`select 1`);
      return res.json({ status: "ok", db: "up" });
    }
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
