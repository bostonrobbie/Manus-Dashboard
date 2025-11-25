
/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  apiKey: varchar("apiKey", { length: 64 }).unique(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * TradePulse Trading Database Schema
 * 
 * Additional tables for trading dashboard:
 * - strategies: Track multiple trading strategies per user
 * - trades: Every trade from TradingView webhooks
 * - positions: Current open positions
 * - equityCurve: Portfolio value over time
 * - analytics: Pre-computed daily metrics
 * - benchmarks: Market benchmark data (SPY, QQQ, etc.)
 * - webhookLogs: Audit trail of all incoming webhooks
 */

/**
 * Strategies table - Track multiple trading strategies per user
 */
export const strategies = mysqlTable("strategies", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  
  name: varchar("name", { length: 255 }).notNull(),
  symbol: varchar("symbol", { length: 50 }).notNull(),