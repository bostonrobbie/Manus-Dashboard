import {
  decimal,
  index,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull(),
  name: text("name"),
  email: varchar("email", { length: 320 })
    .notNull()
    .unique("users_email_unique"),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
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
  type: mysqlEnum("type", ["swing", "intraday"]).notNull().default("swing"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const trades = mysqlTable(
  "trades",
  {
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
  },
  table => ({
    strategyEntryTimeIdx: index("trades_strategy_entry_idx").on(table.strategyId, table.entryTime),
  }),
);

export const positions = mysqlTable("positions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  strategyId: int("strategyId"),

  symbol: varchar("symbol", { length: 50 }).notNull(),
  side: mysqlEnum("side", ["long", "short"]).notNull(),
  quantity: varchar("quantity", { length: 30 }).notNull(),
  entryPrice: varchar("entryPrice", { length: 30 }).notNull(),
  entryTime: timestamp("entryTime").notNull(),

  currentPrice: varchar("currentPrice", { length: 30 }),
  unrealizedPnL: varchar("unrealizedPnL", { length: 30 }),

  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const equityCurve = mysqlTable(
  "equityCurve",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    strategyId: int("strategyId"),

    date: varchar("date", { length: 16 }).notNull(),
    equity: varchar("equity", { length: 30 }).notNull(),
    dailyReturn: varchar("dailyReturn", { length: 20 }),
    cumulativeReturn: varchar("cumulativeReturn", { length: 20 }),

    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => ({
    strategyDateIdx: index("equity_curve_strategy_date_idx").on(table.strategyId, table.date),
  }),
);

export const analytics = mysqlTable("analytics", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  strategyId: int("strategyId"),

  date: varchar("date", { length: 16 }).notNull(),

  rollingReturn: varchar("rollingReturn", { length: 20 }),
  rollingSharpe: varchar("rollingSharpe", { length: 20 }),
  rollingVolatility: varchar("rollingVolatility", { length: 20 }),
  rollingMaxDrawdown: varchar("rollingMaxDrawdown", { length: 20 }),

  tradesCount: int("tradesCount").default(0),
  winRate: varchar("winRate", { length: 20 }),
  avgWin: varchar("avgWin", { length: 20 }),
  avgLoss: varchar("avgLoss", { length: 20 }),
  profitFactor: varchar("profitFactor", { length: 20 }),

  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const benchmarks = mysqlTable("benchmarks", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  symbol: varchar("symbol", { length: 64 }).notNull().default("SPY"),
  date: varchar("date", { length: 16 }).notNull(),
  close: decimal("close", { precision: 18, scale: 4 }).notNull(),
  open: varchar("open", { length: 30 }),
  high: varchar("high", { length: 30 }),
  low: varchar("low", { length: 30 }),
  volume: varchar("volume", { length: 30 }),
  dailyReturn: varchar("dailyReturn", { length: 20 }),
  uploadId: int("uploadId"),
  deletedAt: timestamp("deletedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const webhookLogs = mysqlTable("webhookLogs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),

  source: varchar("source", { length: 50 }).notNull().default("tradingview"),
  event: varchar("event", { length: 50 }).notNull(),

  payload: text("payload"),
  status: mysqlEnum("status", ["success", "error", "pending"]).notNull().default("pending"),
  errorMessage: text("errorMessage"),

  processedAt: timestamp("processedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const uploadLogs = mysqlTable("uploadLogs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  fileName: varchar("fileName", { length: 255 }).notNull(),
  uploadType: mysqlEnum("uploadType", ["trades", "benchmarks", "equity"]).notNull().default("trades"),
  rowCountTotal: int("rowCountTotal").default(0).notNull(),
  rowCountImported: int("rowCountImported").default(0).notNull(),
  rowCountFailed: int("rowCountFailed").default(0).notNull(),
  status: mysqlEnum("uploadStatus", ["pending", "success", "partial", "failed"]).notNull().default("pending"),
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
export type Position = typeof positions.$inferSelect;
export type InsertPosition = typeof positions.$inferInsert;
export type EquityCurve = typeof equityCurve.$inferSelect;
export type InsertEquityCurve = typeof equityCurve.$inferInsert;
export type Analytics = typeof analytics.$inferSelect;
export type InsertAnalytics = typeof analytics.$inferInsert;
export type Benchmark = typeof benchmarks.$inferSelect;
export type UploadLog = typeof uploadLogs.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;
export type WebhookLog = typeof webhookLogs.$inferSelect;
export type InsertWebhookLog = typeof webhookLogs.$inferInsert;
