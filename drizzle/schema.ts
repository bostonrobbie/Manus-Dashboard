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


/**
 * Webhook logs table
 * Stores all incoming TradingView webhook notifications for auditing and debugging
 */
export const webhookLogs = mysqlTable("webhook_logs", {
  id: int("id").autoincrement().primaryKey(),
  // Raw payload for debugging
  payload: text("payload").notNull(), // JSON string of the raw webhook payload
  // Processing status
  status: mysqlEnum("status", ["pending", "processing", "success", "failed", "duplicate"]).default("pending").notNull(),
  // Parsed fields (for quick querying)
  strategyId: int("strategyId"), // Linked strategy (if found)
  strategySymbol: varchar("strategySymbol", { length: 20 }), // Strategy symbol from payload
  tradeId: int("tradeId"), // Created trade ID (if successful)
  direction: varchar("direction", { length: 10 }), // "Long" or "Short"
  entryPrice: int("entryPrice"), // Entry price in cents
  exitPrice: int("exitPrice"), // Exit price in cents
  pnl: int("pnl"), // P&L in cents
  entryTime: datetime("entryTime"), // Parsed entry timestamp
  exitTime: datetime("exitTime"), // Parsed exit timestamp
  // Metadata
  ipAddress: varchar("ipAddress", { length: 45 }), // Source IP for security auditing
  processingTimeMs: int("processingTimeMs"), // How long processing took
  errorMessage: text("errorMessage"), // Error details if failed
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type WebhookLog = typeof webhookLogs.$inferSelect;
export type InsertWebhookLog = typeof webhookLogs.$inferInsert;


/**
 * Broker connections table
 * Stores connected broker accounts for automated trading
 */
export const brokerConnections = mysqlTable("broker_connections", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(), // Owner of this connection
  broker: mysqlEnum("broker", ["tradovate", "ibkr", "fidelity"]).notNull(),
  name: varchar("name", { length: 100 }).notNull(), // User-friendly name for this connection
  // Connection status
  status: mysqlEnum("status", ["disconnected", "connecting", "connected", "error"]).default("disconnected").notNull(),
  // Encrypted credentials (stored securely)
  encryptedCredentials: text("encryptedCredentials"), // JSON blob with encrypted API keys/tokens
  // Account info (cached from broker)
  accountId: varchar("accountId", { length: 100 }), // Broker account ID
  accountName: varchar("accountName", { length: 100 }), // Account display name
  accountType: varchar("accountType", { length: 50 }), // e.g., "live", "paper", "demo"
  // OAuth tokens (for OAuth-based brokers)
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  tokenExpiresAt: datetime("tokenExpiresAt"),
  // Metadata
  lastConnectedAt: datetime("lastConnectedAt"),
  lastError: text("lastError"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type BrokerConnection = typeof brokerConnections.$inferSelect;
export type InsertBrokerConnection = typeof brokerConnections.$inferInsert;

/**
 * Routing rules table
 * Configures how webhook signals are routed to brokers
 */
export const routingRules = mysqlTable("routing_rules", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  // Source matching
  strategyId: int("strategyId"), // Match specific strategy (null = all)
  direction: varchar("direction", { length: 10 }), // Match specific direction (null = all)
  // Target broker
  brokerConnectionId: int("brokerConnectionId").notNull(),
  // Execution settings
  enabled: boolean("enabled").default(true).notNull(),
  autoExecute: boolean("autoExecute").default(false).notNull(), // Auto-execute or just log
  quantityMultiplier: decimal("quantityMultiplier", { precision: 10, scale: 4 }).default("1.0000").notNull(),
  // Risk controls
  maxPositionSize: int("maxPositionSize"), // Max contracts per trade
  maxDailyLoss: int("maxDailyLoss"), // Max daily loss in cents before stopping
  // Metadata
  priority: int("priority").default(0).notNull(), // Higher = evaluated first
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type RoutingRule = typeof routingRules.$inferSelect;
export type InsertRoutingRule = typeof routingRules.$inferInsert;

/**
 * Execution logs table
 * Records all order execution attempts and results
 */
export const executionLogs = mysqlTable("execution_logs", {
  id: int("id").autoincrement().primaryKey(),
  webhookLogId: int("webhookLogId").notNull(), // Link to source webhook
  routingRuleId: int("routingRuleId"), // Which rule triggered this
  brokerConnectionId: int("brokerConnectionId").notNull(),
  // Execution details
  status: mysqlEnum("status", ["pending", "submitted", "filled", "partial", "rejected", "cancelled", "error"]).default("pending").notNull(),
  orderType: varchar("orderType", { length: 20 }), // "market", "limit", etc.
  side: varchar("side", { length: 10 }), // "buy" or "sell"
  symbol: varchar("symbol", { length: 20 }),
  quantity: int("quantity"),
  price: int("price"), // Requested price in cents
  // Broker response
  brokerOrderId: varchar("brokerOrderId", { length: 100 }),
  fillPrice: int("fillPrice"), // Actual fill price in cents
  fillQuantity: int("fillQuantity"),
  commission: int("commission"), // Commission in cents
  // Timing
  submittedAt: datetime("submittedAt"),
  filledAt: datetime("filledAt"),
  // Error handling
  errorMessage: text("errorMessage"),
  retryCount: int("retryCount").default(0).notNull(),
  // Metadata
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ExecutionLog = typeof executionLogs.$inferSelect;
export type InsertExecutionLog = typeof executionLogs.$inferInsert;
