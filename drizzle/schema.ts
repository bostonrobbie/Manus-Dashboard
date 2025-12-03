// @ts-nocheck
import {
  decimal,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

export const strategyType = mysqlEnum("strategyType", [
  "swing",
  "intraday",
]);
export const uploadStatus = mysqlEnum("uploadStatus", [
  "pending",
  "success",
  "partial",
  "failed",
]);
export const uploadType = mysqlEnum("uploadType", [
  "trades",
  "benchmarks",
  "equity",
]);
export const userRole = mysqlEnum("role", ["user", "admin"]);

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull(),
  name: text("name"),
  email: varchar("email", { length: 320 })
    .notNull()
    .unique("users_email_unique"),
  role: userRole("role").default("user").notNull(),
  authProvider: varchar("authProvider", { length: 64 }).default("manus"),
  authProviderId: varchar("authProviderId", { length: 128 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const strategies = mysqlTable("strategies", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  symbol: varchar("symbol", { length: 32 }).default("SPY").notNull(),
  type: strategyType("type").notNull().default("swing"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const trades = mysqlTable("trades", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  strategyId: int("strategyId").notNull(),
  symbol: varchar("symbol", { length: 24 }).notNull(),
  side: varchar("side", { length: 16 }).notNull(),
  quantity: decimal("quantity", { precision: 18, scale: 4 }).notNull(),
  entryPrice: decimal("entryPrice", { precision: 18, scale: 4 }).notNull(),
  exitPrice: decimal("exitPrice", { precision: 18, scale: 4 }).notNull(),
  entryTime: timestamp("entryTime").notNull(),
  exitTime: timestamp("exitTime").notNull(),
  externalId: varchar("externalId", { length: 128 }).unique(
    "trades_external_unique",
  ),
  naturalKey: varchar("naturalKey", { length: 512 }).unique(
    "trades_natural_key_unique",
  ),
  uploadId: int("uploadId"),
  deletedAt: timestamp("deletedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const benchmarks = mysqlTable("benchmarks", {
  id: int("id").autoincrement().primaryKey(),
  symbol: varchar("symbol", { length: 64 }).notNull().default("SPY"),
  date: varchar("date", { length: 16 }).notNull(),
  close: decimal("close", { precision: 18, scale: 4 }).notNull(),
  uploadId: int("uploadId"),
  deletedAt: timestamp("deletedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const uploadLogs = mysqlTable("uploadLogs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  fileName: varchar("fileName", { length: 255 }).notNull(),
  uploadType: uploadType("uploadType").notNull().default("trades"),
  rowCountTotal: int("rowCountTotal").default(0).notNull(),
  rowCountImported: int("rowCountImported").default(0).notNull(),
  rowCountFailed: int("rowCountFailed").default(0).notNull(),
  status: uploadStatus("status").notNull().default("pending"),
  startedAt: timestamp("startedAt").defaultNow().notNull(),
  finishedAt: timestamp("finishedAt"),
  errorSummary: text("errorSummary"),
  warningsSummary: text("warningsSummary"),
});

export const auditLogs = mysqlTable("auditLogs", {
  id: int("id").autoincrement().primaryKey(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  userId: int("userId").notNull(),
  action: varchar("action", { length: 128 }).notNull(),
  entityType: varchar("entityType", { length: 128 }).notNull(),
  entityId: varchar("entityId", { length: 128 }),
  summary: text("summary"),
});

export type User = typeof users.$inferSelect;
export type Strategy = typeof strategies.$inferSelect;
export type Trade = typeof trades.$inferSelect;
export type Benchmark = typeof benchmarks.$inferSelect;
export type UploadLog = typeof uploadLogs.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;
