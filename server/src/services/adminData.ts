import { eq, inArray } from "drizzle-orm";

import { getDb, schema, type Database } from "@server/db";
import { createLogger } from "@server/utils/logger";
import type { AdminUploadList, AdminWorkspaceSummary, SoftDeleteResult } from "@shared/types/admin";
import type { UploadLogRow, UploadStatus, UploadType } from "@shared/types/uploads";
import { logAudit } from "@server/services/audit";

const logger = createLogger("admin-data");

type WorkspaceRow = typeof schema.workspaces.$inferSelect;
type TradeRow = typeof schema.trades.$inferSelect;
type BenchmarkRow = typeof schema.benchmarks.$inferSelect;

const toTimestamp = (value: Date | string | null | undefined): number => {
  if (!value) return 0;
  if (typeof value === "string") {
    const parsed = new Date(value).getTime();
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return value.getTime();
};

export interface AdminDataAdapter {
  listWorkspaceSummaries(): Promise<AdminWorkspaceSummary[]>;
  listUploadsForWorkspace(params: {
    workspaceId: number;
    page: number;
    pageSize: number;
    uploadType?: UploadType;
    status?: UploadStatus;
  }): Promise<AdminUploadList>;
  softDeleteByUpload(uploadId: number, actorUserId?: number): Promise<SoftDeleteResult>;
  softDeleteTradesByFilter(params: {
    workspaceId: number;
    symbol?: string;
    startDate?: string;
    endDate?: string;
    actorUserId?: number;
  }): Promise<number>;
  softDeleteBenchmarksByFilter(params: {
    workspaceId: number;
    symbol?: string;
    startDate?: string;
    endDate?: string;
    actorUserId?: number;
  }): Promise<number>;
}

let adapterOverride: AdminDataAdapter | null = null;

export function setAdminDataAdapter(adapter: AdminDataAdapter | null) {
  adapterOverride = adapter;
}

async function getAdapter(): Promise<AdminDataAdapter> {
  if (adapterOverride) return adapterOverride;
  const db = await getDb();
  if (!db) {
    throw new Error("Database not configured");
  }
  return createDbAdapter(db);
}

export async function listWorkspaceSummaries(): Promise<AdminWorkspaceSummary[]> {
  const adapter = await getAdapter();
  return adapter.listWorkspaceSummaries();
}

export async function listUploadsForWorkspace(params: {
  workspaceId: number;
  page: number;
  pageSize: number;
  uploadType?: UploadType;
  status?: UploadStatus;
}): Promise<AdminUploadList> {
  const adapter = await getAdapter();
  return adapter.listUploadsForWorkspace(params);
}

export async function softDeleteUpload(uploadId: number, actorUserId?: number): Promise<SoftDeleteResult> {
  const adapter = await getAdapter();
  return adapter.softDeleteByUpload(uploadId, actorUserId);
}

export async function softDeleteTrades(params: {
  workspaceId: number;
  symbol?: string;
  startDate?: string;
  endDate?: string;
  actorUserId?: number;
}): Promise<number> {
  const adapter = await getAdapter();
  return adapter.softDeleteTradesByFilter(params);
}

export async function softDeleteBenchmarks(params: {
  workspaceId: number;
  symbol?: string;
  startDate?: string;
  endDate?: string;
  actorUserId?: number;
}): Promise<number> {
  const adapter = await getAdapter();
  return adapter.softDeleteBenchmarksByFilter(params);
}

function createDbAdapter(db: Database): AdminDataAdapter {
  return {
    async listWorkspaceSummaries() {
      const workspaces: WorkspaceRow[] = await db.select().from(schema.workspaces);
      const trades: TradeRow[] = await db.select().from(schema.trades);
      const benchmarks: BenchmarkRow[] = await db.select().from(schema.benchmarks);
      const uploads: UploadLogRow[] = await db.select().from(schema.uploadLogs);

      return workspaces.map(workspace => {
        const tradeCount = trades.filter(t => t.workspaceId === workspace.id && !t.deletedAt).length;
        const benchmarkCount = benchmarks.filter(b => b.workspaceId === workspace.id && !b.deletedAt).length;
        const lastUpload = uploads
          .filter(u => u.workspaceId === workspace.id)
          .sort((a, b) => toTimestamp(b.startedAt) - toTimestamp(a.startedAt))[0];

        return {
          id: workspace.id,
          externalId: workspace.externalId,
          name: workspace.name,
          tradeCount,
          benchmarkCount,
          lastUploadAt: lastUpload?.startedAt ?? null,
        } satisfies AdminWorkspaceSummary;
      });
    },

    async listUploadsForWorkspace(params) {
      const uploads: UploadLogRow[] = await db.select().from(schema.uploadLogs);
      const filtered = uploads
        .filter(u => u.workspaceId === params.workspaceId)
        .filter(u => (params.uploadType ? u.uploadType === params.uploadType : true))
        .filter(u => (params.status ? u.status === params.status : true))
        .sort((a, b) => toTimestamp(b.startedAt) - toTimestamp(a.startedAt));

      const offset = (params.page - 1) * params.pageSize;
      const rows = filtered.slice(offset, offset + params.pageSize) as UploadLogRow[];

      return { rows, total: filtered.length } satisfies AdminUploadList;
    },

    async softDeleteByUpload(uploadId, actorUserId) {
      const [uploadLog] = await db.select().from(schema.uploadLogs).where(eq(schema.uploadLogs.id, uploadId));

      if (!uploadLog) {
        throw new Error("Upload not found");
      }

      const deletedAt = new Date();
      let tradesDeleted = 0;
      let benchmarksDeleted = 0;

      if (uploadLog.uploadType === "trades") {
        const trades: TradeRow[] = await db.select().from(schema.trades);
        const targetIds = trades
          .filter(t => t.uploadId === uploadId && t.workspaceId === uploadLog.workspaceId && !t.deletedAt)
          .map(t => t.id);
        if (targetIds.length > 0) {
          const updated = await db
            .update(schema.trades)
            .set({ deletedAt })
            .where(inArray(schema.trades.id, targetIds))
            .returning({ id: schema.trades.id });
          tradesDeleted = updated.length;
        }
      }

      if (uploadLog.uploadType === "benchmarks") {
        const benchmarks: BenchmarkRow[] = await db.select().from(schema.benchmarks);
        const targetIds = benchmarks
          .filter(b => b.uploadId === uploadId && b.workspaceId === uploadLog.workspaceId && !b.deletedAt)
          .map(b => b.id);
        if (targetIds.length > 0) {
          const updated = await db
            .update(schema.benchmarks)
            .set({ deletedAt })
            .where(inArray(schema.benchmarks.id, targetIds))
            .returning({ id: schema.benchmarks.id });
          benchmarksDeleted = updated.length;
        }
      }

      const note = `Soft deleted ${tradesDeleted} trades and ${benchmarksDeleted} benchmarks for upload ${uploadId}`;
      const summary = [uploadLog.warningsSummary, note].filter(Boolean).join("\n");
      await db.update(schema.uploadLogs).set({ warningsSummary: summary }).where(eq(schema.uploadLogs.id, uploadId));

      logger.info("Soft delete by upload", {
        eventName: "ADMIN_SOFT_DELETE_UPLOAD",
        uploadId,
        workspaceId: uploadLog.workspaceId,
        type: uploadLog.uploadType,
        tradesDeleted,
        benchmarksDeleted,
      });

      await logAudit({
        userId: actorUserId ?? uploadLog.userId ?? 0,
        workspaceId: uploadLog.workspaceId,
        action: "soft_delete_upload",
        entityType: "upload",
        entityId: uploadId,
        summary: note,
      });

      return { tradesDeleted, benchmarksDeleted, note } satisfies SoftDeleteResult;
    },

    async softDeleteTradesByFilter(params) {
      const trades: TradeRow[] = await db.select().from(schema.trades);
      const start = params.startDate ? new Date(`${params.startDate}T00:00:00.000Z`) : null;
      const end = params.endDate ? new Date(`${params.endDate}T23:59:59.999Z`) : null;

      const targetIds = trades
        .filter(t => t.workspaceId === params.workspaceId)
        .filter(t => !t.deletedAt)
        .filter(t => (params.symbol ? t.symbol === params.symbol : true))
        .filter(t => {
          if (!start && !end) return true;
          const exit = t.exitTime instanceof Date ? t.exitTime : new Date(t.exitTime);
          if (start && exit < start) return false;
          if (end && exit > end) return false;
          return true;
        })
        .map(t => t.id);

      if (targetIds.length === 0) return 0;

      const updated = await db
        .update(schema.trades)
        .set({ deletedAt: new Date() })
        .where(inArray(schema.trades.id, targetIds))
        .returning({ id: schema.trades.id });

      logger.info("Soft delete trades by filter", {
        eventName: "ADMIN_SOFT_DELETE_TRADES",
        workspaceId: params.workspaceId,
        symbol: params.symbol,
        startDate: params.startDate,
        endDate: params.endDate,
        count: updated.length,
      });

      await logAudit({
        userId: params.actorUserId ?? 0,
        workspaceId: params.workspaceId,
        action: "soft_delete_trades",
        entityType: "workspace",
        summary: `Soft deleted ${updated.length} trades for workspace ${params.workspaceId}`,
      });

      return updated.length;
    },

    async softDeleteBenchmarksByFilter(params) {
      const benchmarks: BenchmarkRow[] = await db.select().from(schema.benchmarks);
      const start = params.startDate ?? null;
      const end = params.endDate ?? null;

      const targetIds = benchmarks
        .filter(b => b.workspaceId === params.workspaceId)
        .filter(b => !b.deletedAt)
        .filter(b => (params.symbol ? b.symbol === params.symbol : true))
        .filter(b => {
          if (!start && !end) return true;
          if (start && b.date < start) return false;
          if (end && b.date > end) return false;
          return true;
        })
        .map(b => b.id);

      if (targetIds.length === 0) return 0;

      const updated = await db
        .update(schema.benchmarks)
        .set({ deletedAt: new Date() })
        .where(inArray(schema.benchmarks.id, targetIds))
        .returning({ id: schema.benchmarks.id });

      logger.info("Soft delete benchmarks by filter", {
        eventName: "ADMIN_SOFT_DELETE_BENCHMARKS",
        workspaceId: params.workspaceId,
        symbol: params.symbol,
        startDate: params.startDate,
        endDate: params.endDate,
        count: updated.length,
      });

      await logAudit({
        userId: params.actorUserId ?? 0,
        workspaceId: params.workspaceId,
        action: "soft_delete_benchmarks",
        entityType: "workspace",
        summary: `Soft deleted ${updated.length} benchmarks for workspace ${params.workspaceId}`,
      });

      return updated.length;
    },
  } satisfies AdminDataAdapter;
}
