import { sql } from "drizzle-orm";

import { getDb, pingDatabaseOnce, schema } from "@server/db";
import { env } from "@server/utils/env";
import { createLogger } from "@server/utils/logger";
import { getVersionInfo } from "./version";

const healthLogger = createLogger("health");

type SignalState = "ok" | "error" | "unknown";

export type HealthSummary = {
  status: "ok" | "degraded" | "error";
  mode: "MANUS" | "LOCAL_DEV";
  manusReady: boolean;
  mockUser: boolean;
  warnings: string[];
  timestamp: string;
  db: SignalState;
  workspaces: SignalState;
  uploads: SignalState;
  version?: string;
  commit?: string;
};

export type FullHealthSummary = HealthSummary & {
  auth: "ok" | "warning" | "error";
  details?: {
    db?: string;
    workspaces?: string;
    uploads?: string;
    auth?: string;
  };
};

const baseSummary = (): HealthSummary => {
  const versionInfo = getVersionInfo();
  const dbState: SignalState = env.databaseUrl ? "unknown" : "error";

  return {
    status: env.manusMode && !env.manusReady ? "degraded" : dbState === "error" ? "degraded" : "ok",
    mode: env.modeLabel,
    manusReady: env.manusReady,
    mockUser: env.mockUserEnabled,
    warnings: [...env.warnings],
    timestamp: new Date().toISOString(),
    db: dbState,
    workspaces: "ok",
    uploads: dbState,
    ...versionInfo,
  };
};

export async function runBasicHealthCheck(): Promise<{ status: number; body: HealthSummary }> {
  try {
    const summary = baseSummary();
    try {
      const db = await getDb();
      if (db) {
        await pingDatabaseOnce();
        await db.execute(sql`select 1`);
        summary.db = "ok";
        summary.uploads = "ok";
      } else {
        summary.db = "error";
        summary.uploads = "error";
        summary.warnings = [...summary.warnings, "Database unavailable"];
      }
    } catch (error) {
      summary.db = "error";
      summary.uploads = "error";
      summary.warnings = [...summary.warnings, (error as Error).message];
      healthLogger.error("Basic health check failed", { error: (error as Error).message });
    }

    const statusCode = summary.status === "ok" && summary.db !== "error" ? 200 : 202;
    return { status: statusCode, body: summary };
  } catch (error) {
    healthLogger.error("Basic health check failed", { error: (error as Error).message });
    const versionInfo = getVersionInfo();
    const failureSummary: HealthSummary = {
      status: "error",
      mode: env.modeLabel,
      manusReady: env.manusReady,
      mockUser: env.mockUserEnabled,
      warnings: [...env.warnings, String(error)],
      timestamp: new Date().toISOString(),
      db: "error",
      workspaces: "error",
      uploads: "error",
      ...versionInfo,
    };

    return { status: 500, body: failureSummary };
  }
}

export async function runFullHealthCheck(getDbImpl: typeof getDb = getDb): Promise<{ status: number; body: FullHealthSummary }> {
  try {
    const summary: FullHealthSummary = {
      ...baseSummary(),
      db: env.databaseUrl ? "ok" : "unknown",
      workspaces: "ok",
      uploads: env.databaseUrl ? "ok" : "unknown",
      auth: env.manusMode ? (env.manusReady ? "ok" : "error") : "warning",
      details: {},
    };

    try {
      const db = await getDbImpl();
      if (!db) {
        summary.db = "error";
        summary.uploads = "error";
        summary.warnings = [...summary.warnings, "Database unavailable"];
        summary.details = { ...summary.details, db: "Database not configured" };
      } else {
        if (!(process.env.NODE_ENV === "test" && process.env.USE_REAL_DB !== "true")) {
          await pingDatabaseOnce();
        }
        summary.db = "ok";
        await db.execute(sql`select 1`);

        try {
          await db.select({ id: schema.uploadLogs.id }).from(schema.uploadLogs).limit(1);
          summary.uploads = "ok";
        } catch (error) {
          summary.uploads = "error";
          summary.details = { ...summary.details, uploads: (error as Error).message };
          healthLogger.warn("Upload log health query failed", { error: (error as Error).message });
        }
      }
    } catch (error) {
      summary.db = "error";
      summary.uploads = "error";
      summary.workspaces = "error";
      summary.details = { ...summary.details, db: (error as Error).message };
      healthLogger.error("Health check failed", { error: (error as Error).message });
    }

    if (summary.auth === "error") {
      summary.details = { ...summary.details, auth: "Manus auth inputs missing" };
      summary.warnings = [...summary.warnings, "Manus auth secrets missing"];
    }

    const failingSignals = [summary.db, summary.workspaces, summary.uploads].filter(status => status === "error");
    const statusCode = failingSignals.length === 0 && summary.auth !== "error" ? 200 : 503;
    summary.status = statusCode === 200 ? "ok" : "error";

    return { status: statusCode, body: summary };
  } catch (error) {
    const versionInfo = getVersionInfo();
    healthLogger.error("Full health check failed", { error: (error as Error).message });

    const failureSummary: FullHealthSummary = {
      status: "error",
      mode: env.modeLabel,
      manusReady: env.manusReady,
      mockUser: env.mockUserEnabled,
      warnings: [...env.warnings, String(error)],
      timestamp: new Date().toISOString(),
      db: "error",
      workspaces: "error",
      uploads: "error",
      auth: "error",
      details: { db: String(error) },
      ...versionInfo,
    };

    return { status: 500, body: failureSummary };
  }
}
