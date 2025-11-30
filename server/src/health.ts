import { sql } from "drizzle-orm";

import { getDb, schema } from "@server/db";
import { env } from "@server/utils/env";
import { createLogger } from "@server/utils/logger";

const healthLogger = createLogger("health");

export type HealthSummary = {
  status: "ok" | "degraded" | "error";
  mode: "MANUS" | "LOCAL_DEV";
  manusReady: boolean;
  mockUser: boolean;
  warnings: string[];
  timestamp: string;
};

export type FullHealthSummary = HealthSummary & {
  db: "ok" | "error";
  workspaces: "ok" | "error";
  uploads: "ok" | "error";
  auth: "ok" | "warning" | "error";
  details?: {
    db?: string;
    workspaces?: string;
    uploads?: string;
    auth?: string;
  };
};

const baseSummary = (): HealthSummary => ({
  status: env.manusMode && !env.manusReady ? "degraded" : "ok",
  mode: env.modeLabel,
  manusReady: env.manusReady,
  mockUser: env.mockUserEnabled,
  warnings: [...env.warnings],
  timestamp: new Date().toISOString(),
});

export async function runBasicHealthCheck(): Promise<{ status: number; body: HealthSummary }> {
  const summary = baseSummary();
  const statusCode = summary.status === "ok" ? 200 : 202;
  return { status: statusCode, body: summary };
}

export async function runFullHealthCheck(getDbImpl: typeof getDb = getDb): Promise<{ status: number; body: FullHealthSummary }> {
  const summary: FullHealthSummary = {
    ...baseSummary(),
    db: "ok",
    workspaces: "ok",
    uploads: "ok",
    auth: env.manusMode ? (env.manusReady ? "ok" : "error") : "warning",
    details: {},
  };

  try {
    const db = await getDbImpl();
    if (!db) {
      summary.db = "error";
      summary.workspaces = "error";
      summary.uploads = "error";
      summary.warnings = [...summary.warnings, "Database unavailable"];
      summary.details = { ...summary.details, db: "Database not configured" };
    } else {
      await db.execute(sql`select 1`);

      try {
        await db.select({ id: schema.workspaces.id }).from(schema.workspaces).limit(1);
      } catch (error) {
        summary.workspaces = "error";
        summary.details = { ...summary.details, workspaces: (error as Error).message };
        healthLogger.warn("Workspace health query failed", { error: (error as Error).message });
      }

      try {
        await db.select({ id: schema.uploadLogs.id }).from(schema.uploadLogs).limit(1);
      } catch (error) {
        summary.uploads = "error";
        summary.details = { ...summary.details, uploads: (error as Error).message };
        healthLogger.warn("Upload log health query failed", { error: (error as Error).message });
      }
    }
  } catch (error) {
    summary.db = "error";
    summary.workspaces = "error";
    summary.uploads = "error";
    summary.details = { ...summary.details, db: (error as Error).message };
    healthLogger.error("Health check failed", { error: (error as Error).message });
  }

  if (summary.auth === "error") {
    summary.details = { ...summary.details, auth: "Manus auth inputs missing" };
    summary.warnings = [...summary.warnings, "Manus auth secrets missing"];
  }

  const failingSignals = [summary.db, summary.workspaces, summary.uploads].filter(status => status !== "ok");
  const statusCode = failingSignals.length === 0 && summary.auth !== "error" ? 200 : 503;
  summary.status = statusCode === 200 ? "ok" : "error";

  return { status: statusCode, body: summary };
}
