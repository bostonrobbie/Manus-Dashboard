import { sql } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "../db";
import { buildPortfolioOverview } from "../portfolio-engine";
import { createLogger } from "../utils/logger";
import { publicProcedure, router } from "../_core/trpc";

const statusSchema = z.object({
  db: z.enum(["ok", "error"]),
  portfolioOverview: z.enum(["ok", "error"]),
  timestamp: z.string(),
});

const toIsoDate = (date: Date) => date.toISOString().slice(0, 10);

export const systemRouter = router({
  status: publicProcedure.output(statusSchema).query(async ({ ctx }) => {
    const logger = createLogger("system-router");
    let dbStatus: "ok" | "error" = "ok";
    let portfolioStatus: "ok" | "error" = "ok";

    try {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");
      await db.execute(sql`select 1`);
    } catch (error) {
      dbStatus = "error";
      logger.error("System status DB check failed", {
        error: error instanceof Error ? error.message : String(error),
      });
    }

    try {
      const today = new Date();
      const rangeEnd = toIsoDate(today);
      const start = new Date(`${rangeEnd}T00:00:00.000Z`);
      start.setUTCDate(start.getUTCDate() - 30);
      await buildPortfolioOverview({ userId: ctx.user?.id ?? 1 }, { startDate: toIsoDate(start), endDate: rangeEnd });
    } catch (error) {
      portfolioStatus = "error";
      logger.warn("System status portfolio probe failed", {
        error: error instanceof Error ? error.message : String(error),
        userId: ctx.user?.id,
      });
    }

    return statusSchema.parse({
      db: dbStatus,
      portfolioOverview: portfolioStatus,
      timestamp: new Date().toISOString(),
    });
  }),
});
