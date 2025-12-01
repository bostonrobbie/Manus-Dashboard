import { and, desc, eq, sql } from "drizzle-orm";

import { getDb, schema } from "@server/db";

export type UploadStatus = "pending" | "success" | "partial" | "failed";
export type UploadType = "trades" | "benchmarks" | "equity";

export interface UploadLogInput {
  userId: number;
  ownerId?: number;
  workspaceId: number;
  fileName: string;
  uploadType: UploadType;
}

export interface UploadLogUpdate {
  rowCountTotal?: number;
  rowCountImported?: number;
  rowCountFailed?: number;
  status?: UploadStatus;
  errorSummary?: string | null;
  warningsSummary?: string | null;
  finishedAt?: Date;
}

export async function createUploadLog(input: UploadLogInput) {
  const db = await getDb();
  if (!db) return null;

  const [log] = await db
    .insert(schema.uploadLogs)
    .values({
      userId: input.userId,
      ownerId: input.ownerId ?? input.userId,
      workspaceId: input.workspaceId,
      fileName: input.fileName,
      uploadType: input.uploadType,
      status: "pending",
      startedAt: new Date(),
    })
    .returning();

  return log;
}

export async function updateUploadLog(id: number, update: UploadLogUpdate) {
  const db = await getDb();
  if (!db) return null;

  const [log] = await db
    .update(schema.uploadLogs)
    .set({ ...update, finishedAt: update.finishedAt ?? new Date() })
    .where(eq(schema.uploadLogs.id, id))
    .returning();

  return log;
}

export async function getUploadLogById(params: { id: number; userId: number; workspaceId?: number }) {
  const db = await getDb();
  if (!db) return null;

  const predicates = [eq(schema.uploadLogs.id, params.id), eq(schema.uploadLogs.ownerId, params.userId)];
  if (params.workspaceId != null) {
    predicates.push(eq(schema.uploadLogs.workspaceId, params.workspaceId));
  }

  const [log] = await db
    .select()
    .from(schema.uploadLogs)
    .where(and(...predicates));

  return log ?? null;
}

export async function listUploadLogs(params: {
  userId: number;
  workspaceId?: number;
  page: number;
  pageSize: number;
  uploadType?: UploadType;
  status?: UploadStatus;
}) {
  const db = await getDb();
  if (!db) {
    return { rows: [], total: 0 };
  }

  const predicates = [eq(schema.uploadLogs.ownerId, params.userId)];
  if (params.workspaceId != null) {
    predicates.push(eq(schema.uploadLogs.workspaceId, params.workspaceId));
  }
  if (params.uploadType) {
    predicates.push(eq(schema.uploadLogs.uploadType, params.uploadType));
  }
  if (params.status) {
    predicates.push(eq(schema.uploadLogs.status, params.status));
  }

  const offset = (params.page - 1) * params.pageSize;

  const rows = await db
    .select()
    .from(schema.uploadLogs)
    .where(predicates.length > 1 ? and(...predicates) : predicates[0])
    .orderBy(desc(schema.uploadLogs.startedAt))
    .limit(params.pageSize)
    .offset(offset);

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.uploadLogs)
    .where(predicates.length > 1 ? and(...predicates) : predicates[0]);

  return { rows, total: Number(count) };
}
