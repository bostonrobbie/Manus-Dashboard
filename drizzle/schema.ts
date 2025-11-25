// @ts-nocheck
import { pgEnum, pgTable, serial, integer, varchar, text, timestamp, numeric, index } from "drizzle-orm/pg-core";

export const strategyType = pgEnum("strategy_type", ["swing", "intraday"]);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("open_id", { length: 64 }).notNull(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  role: varchar("role", { length: 32 }).default("user").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const strategies = pgTable(
  "strategies",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    symbol: varchar("symbol", { length: 32 }).default("SPY").notNull(),
    type: strategyType("type").notNull().default("swing"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  table => ({
    userIdx: index("strategies_user_idx").on(table.userId),
  })
);

export const trades = pgTable(
  "trades",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull(),
    strategyId: integer("strategy_id").notNull(),
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
  })
);

export const benchmarks = pgTable(
  "benchmarks",
  {
    id: serial("id").primaryKey(),
    date: varchar("date", { length: 16 }).notNull(),
    close: numeric("close", { precision: 18, scale: 4 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  table => ({
    dateIdx: index("benchmarks_date_idx").on(table.date),
  })
);

export type User = typeof users.$inferSelect;
export type Strategy = typeof strategies.$inferSelect;
export type Trade = typeof trades.$inferSelect;
export type Benchmark = typeof benchmarks.$inferSelect;
