import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal, datetime, boolean } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Trading strategies table
 * Stores metadata for each intraday trading strategy
 */
export const strategies = mysqlTable("strategies", {
  id: int("id").autoincrement().primaryKey(),
  symbol: varchar("symbol", { length: 20 }).notNull().unique(), // e.g., "ESTrend", "NQORB"
  name: varchar("name", { length: 100 }).notNull(), // e.g., "ES Trend Following"
  description: text("description"),
  market: varchar("market", { length: 50 }), // e.g., "ES", "NQ", "CL", "BTC", "GC", "YM"
  strategyType: varchar("strategyType", { length: 50 }), // e.g., "Trend", "ORB" (Opening Range Breakout)
  contractSize: mysqlEnum("contractSize", ["mini", "micro"]).default("mini").notNull(), // Contract size: mini/standard or micro
  microToMiniRatio: int("microToMiniRatio").default(10).notNull(), // Conversion ratio (typically 10:1, BTC is 50:1)
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Strategy = typeof strategies.$inferSelect;
export type InsertStrategy = typeof strategies.$inferInsert;

/**
 * Trades table
 * Stores individual trade records for all strategies
 */
export const trades = mysqlTable("trades", {
  id: int("id").autoincrement().primaryKey(),
  strategyId: int("strategyId").notNull(), // Foreign key to strategies table
  entryDate: datetime("entryDate").notNull(), // Entry timestamp
  exitDate: datetime("exitDate").notNull(), // Exit timestamp
  direction: varchar("direction", { length: 10 }).notNull(), // "Long" or "Short"
  entryPrice: int("entryPrice").notNull(), // Entry price in cents (multiply by 100)
  exitPrice: int("exitPrice").notNull(), // Exit price in cents
  quantity: int("quantity").notNull().default(1), // Number of contracts/shares
  pnl: int("pnl").notNull(), // Profit/Loss in cents
  pnlPercent: int("pnlPercent").notNull(), // P&L as percentage (multiply by 10000, e.g., 1.5% = 15000)
  commission: int("commission").default(0).notNull(), // Commission in cents
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Trade = typeof trades.$inferSelect;
export type InsertTrade = typeof trades.$inferInsert;

/**
 * Benchmark data table
 * Stores daily OHLC data for S&P 500 benchmark
 */
export const benchmarks = mysqlTable("benchmarks", {
  id: int("id").autoincrement().primaryKey(),
  date: datetime("date").notNull().unique(), // Trading date
  open: int("open").notNull(), // Open price in cents
  high: int("high").notNull(), // High price in cents
  low: int("low").notNull(), // Low price in cents
  close: int("close").notNull(), // Close price in cents
  volume: int("volume"), // Trading volume
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Benchmark = typeof benchmarks.$inferSelect;
export type InsertBenchmark = typeof benchmarks.$inferInsert;
