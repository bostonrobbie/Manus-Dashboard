import { desc, eq } from "drizzle-orm";
import { z } from "zod";

import { getDb, schema } from "../db";
import { protectedProcedure, requireUser, router } from "../_core/trpc";

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
