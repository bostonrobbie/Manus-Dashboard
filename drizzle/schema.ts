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

export const workspaces = pgTable(
  "workspaces",
  {
    id: serial("id").primaryKey(),
    externalId: varchar("external_id", { length: 128 }).notNull(),
    name: varchar("name", { length: 255 }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  table => ({
    externalIdx: uniqueIndex("workspaces_external_idx").on(table.externalId),
  }),
);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("open_id", { length: 64 }).notNull(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  role: varchar("role", { length: 32 }).default("user").notNull(),
  workspaceId: integer("workspace_id").notNull().default(1),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const strategies = pgTable(
  "strategies",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull(),
    workspaceId: integer("workspace_id").notNull().default(1),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    symbol: varchar("symbol", { length: 32 }).default("SPY").notNull(),
    type: strategyType("type").notNull().default("swing"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  table => ({
    userIdx: index("strategies_user_idx").on(table.userId),
    workspaceIdx: index("strategies_workspace_idx").on(table.workspaceId),
  })
);

export const trades = pgTable(
  "trades",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull(),
    strategyId: integer("strategy_id").notNull(),
    workspaceId: integer("workspace_id").notNull().default(1),
    symbol: varchar("symbol", { length: 24 }).notNull(),
    side: varchar("side", { length: 16 }).notNull(),
    quantity: numeric("quantity", { precision: 18, scale: 4 }).notNull(),
    entryPrice: numeric("entry_price", { precision: 18, scale: 4 }).notNull(),
    exitPrice: numeric("exit_price", { precision: 18, scale: 4 }).notNull(),
    entryTime: timestamp("entry_time", { withTimezone: true }).notNull(),
    exitTime: timestamp("exit_time", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  table => ({
    userIdx: index("trades_user_idx").on(table.userId),
    strategyIdx: index("trades_strategy_idx").on(table.strategyId),
    workspaceIdx: index("trades_workspace_idx").on(table.workspaceId),
  })
);

export const benchmarks = pgTable(
  "benchmarks",
  {
    id: serial("id").primaryKey(),
    workspaceId: integer("workspace_id").notNull().default(1),
    date: varchar("date", { length: 16 }).notNull(),
    close: numeric("close", { precision: 18, scale: 4 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  table => ({
    dateIdx: index("benchmarks_date_idx").on(table.date),
    workspaceIdx: index("benchmarks_workspace_idx").on(table.workspaceId),
  })
);

export type User = typeof users.$inferSelect;
export type Workspace = typeof workspaces.$inferSelect;
export type Strategy = typeof strategies.$inferSelect;
export type Trade = typeof trades.$inferSelect;
export type Benchmark = typeof benchmarks.$inferSelect;
