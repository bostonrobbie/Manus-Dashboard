// @ts-nocheck
import {
  pgEnum,
  pgTable,
  serial,
  integer,
  varchar,
  text,
  timestamp,
  numeric,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const strategyType = pgEnum("strategy_type", ["swing", "intraday"]);
export const uploadStatus = pgEnum("upload_status", ["pending", "success", "partial", "failed"]);
export const uploadType = pgEnum("upload_type", ["trades", "benchmarks", "equity"]);
export const userRole = pgEnum("user_role", ["OWNER", "ADMIN", "USER", "VIEWER"]);

export const workspaces = pgTable(
  "workspaces",
  {
    id: serial("id").primaryKey(),
    externalId: varchar("external_id", { length: 128 }).notNull(),
    name: varchar("name", { length: 255 }),
    ownerUserId: integer("owner_user_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  table => ({
    externalIdx: uniqueIndex("workspaces_external_idx").on(table.externalId),
    ownerIdx: index("workspaces_owner_idx").on(table.ownerUserId),
  }),
);

export const workspaceMembers = pgTable(
  "workspace_members",
  {
    id: serial("id").primaryKey(),
    workspaceId: integer("workspace_id").notNull(),
    userId: integer("user_id").notNull(),
    role: varchar("role", { length: 32 }).notNull().default("viewer"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  table => ({
    workspaceIdx: index("workspace_members_workspace_idx").on(table.workspaceId),
    userIdx: index("workspace_members_user_idx").on(table.userId),
    uniqueWorkspaceUser: uniqueIndex("workspace_members_workspace_user_idx").on(table.workspaceId, table.userId),
  }),
);

export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    openId: varchar("open_id", { length: 64 }).notNull(),
    name: text("name"),
    email: varchar("email", { length: 320 }).notNull(),
    role: userRole("role").default("USER").notNull(),
    workspaceId: integer("workspace_id").notNull().default(1),
    authProvider: varchar("auth_provider", { length: 64 }).default("manus"),
    authProviderId: varchar("auth_provider_id", { length: 128 }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  table => ({
    uniqueEmail: uniqueIndex("users_email_unique").on(table.email),
    authProviderIdx: index("users_provider_idx").on(table.authProvider, table.authProviderId),
  }),
);

export const strategies = pgTable(
  "strategies",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull(),
    ownerId: integer("owner_id").notNull(),
    workspaceId: integer("workspace_id").notNull().default(1),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    symbol: varchar("symbol", { length: 32 }).default("SPY").notNull(),
    type: strategyType("type").notNull().default("swing"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  table => ({
    userIdx: index("strategies_user_idx").on(table.userId),
    ownerIdx: index("strategies_owner_idx").on(table.ownerId),
    workspaceIdx: index("strategies_workspace_idx").on(table.workspaceId),
  })
);

export const trades = pgTable(
  "trades",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull(),
    ownerId: integer("owner_id").notNull(),
    strategyId: integer("strategy_id").notNull(),
    workspaceId: integer("workspace_id").notNull().default(1),
    symbol: varchar("symbol", { length: 24 }).notNull(),
    side: varchar("side", { length: 16 }).notNull(),
    quantity: numeric("quantity", { precision: 18, scale: 4 }).notNull(),
    entryPrice: numeric("entry_price", { precision: 18, scale: 4 }).notNull(),
    exitPrice: numeric("exit_price", { precision: 18, scale: 4 }).notNull(),
    entryTime: timestamp("entry_time", { withTimezone: true }).notNull(),
    exitTime: timestamp("exit_time", { withTimezone: true }).notNull(),
    externalId: varchar("external_id", { length: 128 }),
    naturalKey: varchar("natural_key", { length: 512 }),
    uploadId: integer("upload_id"),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  table => ({
    userIdx: index("trades_user_idx").on(table.userId),
    ownerIdx: index("trades_owner_idx").on(table.ownerId),
    strategyIdx: index("trades_strategy_idx").on(table.strategyId),
    workspaceIdx: index("trades_workspace_idx").on(table.workspaceId),
    uploadIdx: index("trades_upload_idx").on(table.uploadId),
    deletedIdx: index("trades_deleted_idx").on(table.deletedAt),
    symbolIdx: index("trades_symbol_idx").on(table.symbol),
    exitIdx: index("trades_exit_time_idx").on(table.exitTime),
    externalUnique: uniqueIndex("trades_workspace_external_unique").on(table.workspaceId, table.externalId),
    naturalKeyUnique: uniqueIndex("trades_workspace_natural_key_unique").on(table.workspaceId, table.naturalKey),
  })
);

export const benchmarks = pgTable(
  "benchmarks",
  {
    id: serial("id").primaryKey(),
    symbol: varchar("symbol", { length: 64 }).notNull().default("SPY"),
    ownerId: integer("owner_id").notNull(),
    workspaceId: integer("workspace_id").notNull().default(1),
    date: varchar("date", { length: 16 }).notNull(),
    close: numeric("close", { precision: 18, scale: 4 }).notNull(),
    uploadId: integer("upload_id"),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  table => ({
    dateIdx: index("benchmarks_date_idx").on(table.date),
    ownerIdx: index("benchmarks_owner_idx").on(table.ownerId),
    workspaceIdx: index("benchmarks_workspace_idx").on(table.workspaceId),
    symbolIdx: index("benchmarks_symbol_idx").on(table.symbol),
    uploadIdx: index("benchmarks_upload_idx").on(table.uploadId),
    deletedIdx: index("benchmarks_deleted_idx").on(table.deletedAt),
  })
);

export const uploadLogs = pgTable(
  "upload_logs",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull(),
    ownerId: integer("owner_id").notNull(),
    workspaceId: integer("workspace_id").notNull().default(1),
    fileName: varchar("file_name", { length: 255 }).notNull(),
    uploadType: uploadType("upload_type").notNull().default("trades"),
    rowCountTotal: integer("row_count_total").default(0).notNull(),
    rowCountImported: integer("row_count_imported").default(0).notNull(),
    rowCountFailed: integer("row_count_failed").default(0).notNull(),
    status: uploadStatus("status").notNull().default("pending"),
    startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    errorSummary: text("error_summary"),
    warningsSummary: text("warnings_summary"),
  },
  table => ({
    userIdx: index("upload_logs_user_idx").on(table.userId),
    ownerIdx: index("upload_logs_owner_idx").on(table.ownerId),
    workspaceIdx: index("upload_logs_workspace_idx").on(table.workspaceId),
    startedIdx: index("upload_logs_started_idx").on(table.startedAt),
  }),
);

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: serial("id").primaryKey(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    userId: integer("user_id").notNull(),
    workspaceId: integer("workspace_id").notNull(),
    action: varchar("action", { length: 128 }).notNull(),
    entityType: varchar("entity_type", { length: 128 }).notNull(),
    entityId: varchar("entity_id", { length: 128 }),
    summary: text("summary"),
  },
  table => ({
    workspaceTimeIdx: index("audit_logs_workspace_time_idx").on(table.workspaceId, table.createdAt),
  }),
);

export type User = typeof users.$inferSelect;
export type Workspace = typeof workspaces.$inferSelect;
export type WorkspaceMember = typeof workspaceMembers.$inferSelect;
export type Strategy = typeof strategies.$inferSelect;
export type Trade = typeof trades.$inferSelect;
export type Benchmark = typeof benchmarks.$inferSelect;
export type UploadLog = typeof uploadLogs.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;
