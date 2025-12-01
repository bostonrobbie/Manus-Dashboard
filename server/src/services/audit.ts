import { getDb, schema } from "@server/db";
import { createLogger } from "@server/utils/logger";

const logger = createLogger("audit");

export interface AuditLogInput {
  userId: number;
  ownerId?: number;
  workspaceId: number;
  action: string;
  entityType: string;
  entityId?: string | number | null;
  summary?: string | null;
}

const truncate = (value: string | null | undefined, max = 512) => {
  if (!value) return value ?? null;
  return value.length > max ? `${value.slice(0, max)}…` : value;
};

export async function logAudit(entry: AuditLogInput): Promise<void> {
  const db = await getDb();
  if (!db) {
    logger.warn("Audit log skipped; database unavailable", {
      action: entry.action,
      workspaceId: entry.workspaceId,
      ownerId: entry.ownerId,
    });
    return;
  }

  try {
    await db.insert(schema.auditLogs).values({
      userId: entry.userId,
      workspaceId: entry.workspaceId,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId != null ? String(entry.entityId) : null,
      summary: truncate(entry.summary, 512),
    });
  } catch (error) {
    logger.error("Failed to write audit log", {
      action: entry.action,
      workspaceId: entry.workspaceId,
      error: (error as Error).message,
    });
  }
}
