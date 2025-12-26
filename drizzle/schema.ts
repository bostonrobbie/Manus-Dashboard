import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal, datetime, boolean, index } from "drizzle-orm/mysql-core";

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
  // Subscription fields
  subscriptionTier: mysqlEnum("subscriptionTier", ["free", "pro", "premium"]).default("free").notNull(),
  stripeCustomerId: varchar("stripeCustomerId", { length: 255 }),
  stripeSubscriptionId: varchar("stripeSubscriptionId", { length: 255 }),
  subscriptionStatus: varchar("subscriptionStatus", { length: 50 }).default("active"), // active, canceled, past_due
  // Onboarding
  onboardingCompleted: boolean("onboardingCompleted").default(false).notNull(),
  onboardingDismissed: boolean("onboardingDismissed").default(false).notNull(),
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
  isTest: boolean("isTest").default(false).notNull(), // Test data flag - excluded from analytics
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  strategyIdx: index("idx_trades_strategy").on(table.strategyId),
  isTestIdx: index("idx_trades_is_test").on(table.isTest),
  exitDateIdx: index("idx_trades_exit_date").on(table.exitDate),
  strategyExitIdx: index("idx_trades_strategy_exit").on(table.strategyId, table.exitDate),
}));

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
  isTest: boolean("isTest").default(false).notNull(), // Test data flag
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  strategyIdx: index("idx_webhook_logs_strategy").on(table.strategyId),
  statusIdx: index("idx_webhook_logs_status").on(table.status),
  createdIdx: index("idx_webhook_logs_created").on(table.createdAt),
  isTestIdx: index("idx_webhook_logs_is_test").on(table.isTest),
}));

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
}, (table) => ({
  userIdx: index("idx_broker_connections_user").on(table.userId),
  statusIdx: index("idx_broker_connections_status").on(table.status),
}));

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
}, (table) => ({
  userIdx: index("idx_routing_rules_user").on(table.userId),
  brokerIdx: index("idx_routing_rules_broker").on(table.brokerConnectionId),
}));

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
}, (table) => ({
  webhookIdx: index("idx_execution_logs_webhook").on(table.webhookLogId),
  brokerIdx: index("idx_execution_logs_broker").on(table.brokerConnectionId),
  statusIdx: index("idx_execution_logs_status").on(table.status),
}));

export type ExecutionLog = typeof executionLogs.$inferSelect;
export type InsertExecutionLog = typeof executionLogs.$inferInsert;


/**
 * User strategy subscriptions table
 * Tracks which strategies each user has subscribed to
 */
export const userSubscriptions = mysqlTable("user_subscriptions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  strategyId: int("strategyId").notNull(),
  // Subscription settings
  notificationsEnabled: boolean("notificationsEnabled").default(true).notNull(),
  autoExecuteEnabled: boolean("autoExecuteEnabled").default(false).notNull(),
  // User's custom settings for this strategy
  quantityMultiplier: decimal("quantityMultiplier", { precision: 10, scale: 4 }).default("1.0000"),
  maxPositionSize: int("maxPositionSize"), // User's max contracts for this strategy
  // Metadata
  subscribedAt: timestamp("subscribedAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type UserSubscription = typeof userSubscriptions.$inferSelect;
export type InsertUserSubscription = typeof userSubscriptions.$inferInsert;

/**
 * Subscription tiers table
 * Defines available subscription plans (Stripe-ready)
 */
export const subscriptionTiers = mysqlTable("subscription_tiers", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 50 }).notNull(), // e.g., "Basic", "Pro", "Enterprise"
  description: text("description"),
  // Pricing (in cents)
  priceMonthly: int("priceMonthly").notNull(), // Monthly price in cents
  priceYearly: int("priceYearly"), // Yearly price in cents (optional discount)
  // Features/limits
  maxStrategies: int("maxStrategies"), // Max strategies user can subscribe to (null = unlimited)
  maxBrokerConnections: int("maxBrokerConnections"), // Max broker accounts
  autoExecuteAllowed: boolean("autoExecuteAllowed").default(false).notNull(),
  prioritySupport: boolean("prioritySupport").default(false).notNull(),
  // Stripe integration (ready but not active)
  stripeProductId: varchar("stripeProductId", { length: 100 }),
  stripePriceIdMonthly: varchar("stripePriceIdMonthly", { length: 100 }),
  stripePriceIdYearly: varchar("stripePriceIdYearly", { length: 100 }),
  // Status
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SubscriptionTier = typeof subscriptionTiers.$inferSelect;
export type InsertSubscriptionTier = typeof subscriptionTiers.$inferInsert;

/**
 * User payment subscriptions table
 * Tracks user's active subscription (Stripe-ready)
 */
export const userPaymentSubscriptions = mysqlTable("user_payment_subscriptions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(), // One active subscription per user
  tierId: int("tierId").notNull(),
  // Subscription status
  status: mysqlEnum("status", ["active", "past_due", "cancelled", "paused", "trialing"]).default("active").notNull(),
  // Billing cycle
  billingCycle: mysqlEnum("billingCycle", ["monthly", "yearly"]).default("monthly").notNull(),
  currentPeriodStart: datetime("currentPeriodStart"),
  currentPeriodEnd: datetime("currentPeriodEnd"),
  // Trial info
  trialStart: datetime("trialStart"),
  trialEnd: datetime("trialEnd"),
  // Stripe integration (ready but not active)
  stripeCustomerId: varchar("stripeCustomerId", { length: 100 }),
  stripeSubscriptionId: varchar("stripeSubscriptionId", { length: 100 }),
  // Cancellation
  cancelAtPeriodEnd: boolean("cancelAtPeriodEnd").default(false).notNull(),
  cancelledAt: datetime("cancelledAt"),
  // Metadata
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type UserPaymentSubscription = typeof userPaymentSubscriptions.$inferSelect;
export type InsertUserPaymentSubscription = typeof userPaymentSubscriptions.$inferInsert;

/**
 * Payment history table
 * Records all payment transactions (Stripe-ready)
 */
export const paymentHistory = mysqlTable("payment_history", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  subscriptionId: int("subscriptionId"),
  // Payment details
  amount: int("amount").notNull(), // Amount in cents
  currency: varchar("currency", { length: 3 }).default("USD").notNull(),
  status: mysqlEnum("status", ["pending", "succeeded", "failed", "refunded"]).default("pending").notNull(),
  // Stripe integration
  stripePaymentIntentId: varchar("stripePaymentIntentId", { length: 100 }),
  stripeInvoiceId: varchar("stripeInvoiceId", { length: 100 }),
  // Receipt info
  receiptUrl: text("receiptUrl"),
  description: text("description"),
  // Metadata
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  userIdx: index("idx_payment_history_user").on(table.userId),
  statusIdx: index("idx_payment_history_status").on(table.status),
  createdIdx: index("idx_payment_history_created").on(table.createdAt),
}));

export type PaymentHistoryRecord = typeof paymentHistory.$inferSelect;
export type InsertPaymentHistory = typeof paymentHistory.$inferInsert;

/**
 * Audit logs table
 * Records all sensitive actions for compliance and debugging
 */
export const auditLogs = mysqlTable("audit_logs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"), // User who performed action (null for system actions)
  // Action details
  action: varchar("action", { length: 100 }).notNull(), // e.g., "broker.connect", "subscription.create", "trade.execute"
  resourceType: varchar("resourceType", { length: 50 }), // e.g., "broker_connection", "user_subscription"
  resourceId: int("resourceId"), // ID of affected resource
  // Context
  ipAddress: varchar("ipAddress", { length: 45 }),
  userAgent: text("userAgent"),
  // Change tracking
  previousValue: text("previousValue"), // JSON of previous state
  newValue: text("newValue"), // JSON of new state
  // Result
  status: mysqlEnum("status", ["success", "failure"]).default("success").notNull(),
  errorMessage: text("errorMessage"),
  // Metadata
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;

/**
 * Webhook queue table
 * Stores webhooks for reliable processing with retry support
 */
export const webhookQueue = mysqlTable("webhook_queue", {
  id: int("id").autoincrement().primaryKey(),
  // Webhook data
  payload: text("payload").notNull(),
  ipAddress: varchar("ipAddress", { length: 45 }),
  // Processing status
  status: mysqlEnum("status", ["pending", "processing", "completed", "failed", "dead"]).default("pending").notNull(),
  // Retry tracking
  attempts: int("attempts").default(0).notNull(),
  maxAttempts: int("maxAttempts").default(5).notNull(),
  nextRetryAt: datetime("nextRetryAt"),
  lastError: text("lastError"),
  // Linked records
  webhookLogId: int("webhookLogId"), // Created webhook log ID after processing
  // Timing
  receivedAt: timestamp("receivedAt").defaultNow().notNull(),
  startedAt: datetime("startedAt"),
  completedAt: datetime("completedAt"),
  // Metadata
  processingTimeMs: int("processingTimeMs"),
  correlationId: varchar("correlationId", { length: 50 }),
});

export type WebhookQueueItem = typeof webhookQueue.$inferSelect;
export type InsertWebhookQueueItem = typeof webhookQueue.$inferInsert;

/**
 * Dead letter queue table
 * Stores permanently failed webhooks for manual review
 */
export const deadLetterQueue = mysqlTable("dead_letter_queue", {
  id: int("id").autoincrement().primaryKey(),
  // Original webhook data
  originalPayload: text("originalPayload").notNull(),
  ipAddress: varchar("ipAddress", { length: 45 }),
  // Failure info
  failureReason: text("failureReason").notNull(),
  attempts: int("attempts").notNull(),
  lastAttemptAt: datetime("lastAttemptAt"),
  // Error history
  errorHistory: text("errorHistory"), // JSON array of all errors
  // Resolution
  status: mysqlEnum("status", ["unresolved", "resolved", "ignored"]).default("unresolved").notNull(),
  resolvedBy: int("resolvedBy"), // User who resolved
  resolvedAt: datetime("resolvedAt"),
  resolutionNotes: text("resolutionNotes"),
  // Metadata
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type DeadLetterQueueItem = typeof deadLetterQueue.$inferSelect;
export type InsertDeadLetterQueueItem = typeof deadLetterQueue.$inferInsert;

/**
 * User signals table
 * Records signals received by each user for their subscribed strategies
 */
export const userSignals = mysqlTable("user_signals", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  webhookLogId: int("webhookLogId").notNull(), // Source webhook
  strategyId: int("strategyId").notNull(),
  // Signal details
  direction: varchar("direction", { length: 10 }).notNull(),
  price: int("price").notNull(), // Signal price in cents
  quantity: int("quantity").notNull(),
  // User's action
  action: mysqlEnum("action", ["pending", "executed", "skipped", "expired"]).default("pending").notNull(),
  executionLogId: int("executionLogId"), // If executed, link to execution
  // Timing
  signalReceivedAt: datetime("signalReceivedAt").notNull(),
  actionTakenAt: datetime("actionTakenAt"),
  expiresAt: datetime("expiresAt"), // Signal expiration time
  // Metadata
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type UserSignal = typeof userSignals.$inferSelect;
export type InsertUserSignal = typeof userSignals.$inferInsert;

/**
 * Open positions table
 * Tracks currently open trades waiting for exit signals
 * This replaces the in-memory pendingEntries for persistence across server restarts
 */
export const openPositions = mysqlTable("open_positions", {
  id: int("id").autoincrement().primaryKey(),
  strategyId: int("strategyId").notNull(),
  strategySymbol: varchar("strategySymbol", { length: 20 }).notNull(),
  // Position details
  direction: varchar("direction", { length: 10 }).notNull(), // "Long" or "Short"
  entryPrice: int("entryPrice").notNull(), // Entry price in cents
  quantity: int("quantity").notNull().default(1),
  // Timing
  entryTime: datetime("entryTime").notNull(),
  entryWebhookLogId: int("entryWebhookLogId"), // Link to entry webhook log
  // Status
  status: mysqlEnum("status", ["open", "closing", "closed"]).default("open").notNull(),
  // Exit details (filled when closed)
  exitPrice: int("exitPrice"),
  exitTime: datetime("exitTime"),
  exitWebhookLogId: int("exitWebhookLogId"), // Link to exit webhook log
  pnl: int("pnl"), // P&L in cents
  tradeId: int("tradeId"), // Link to created trade record
  isTest: boolean("isTest").default(false).notNull(), // Test data flag
  // Metadata
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  strategyIdx: index("idx_open_positions_strategy").on(table.strategyId),
  statusIdx: index("idx_open_positions_status").on(table.status),
  strategyStatusIdx: index("idx_open_positions_strategy_status").on(table.strategyId, table.status),
  isTestIdx: index("idx_open_positions_is_test").on(table.isTest),
}));

export type OpenPosition = typeof openPositions.$inferSelect;
export type InsertOpenPosition = typeof openPositions.$inferInsert;

/**
 * Signal types enum for webhook processing
 */
export const signalTypeEnum = ["entry", "exit", "scale_in", "scale_out"] as const;
export type SignalType = typeof signalTypeEnum[number];


/**
 * User notification preferences table
 * Stores per-user, per-strategy notification settings
 */
export const notificationPreferences = mysqlTable("notification_preferences", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  // Global settings
  emailNotificationsEnabled: boolean("emailNotificationsEnabled").default(true).notNull(),
  pushNotificationsEnabled: boolean("pushNotificationsEnabled").default(true).notNull(),
  // Notification types
  notifyOnEntry: boolean("notifyOnEntry").default(true).notNull(),
  notifyOnExit: boolean("notifyOnExit").default(true).notNull(),
  notifyOnProfit: boolean("notifyOnProfit").default(true).notNull(),
  notifyOnLoss: boolean("notifyOnLoss").default(true).notNull(),
  // Quiet hours (optional)
  quietHoursStart: varchar("quietHoursStart", { length: 5 }), // HH:MM format
  quietHoursEnd: varchar("quietHoursEnd", { length: 5 }), // HH:MM format
  quietHoursTimezone: varchar("quietHoursTimezone", { length: 50 }).default("America/New_York"),
  // Metadata
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type NotificationPreference = typeof notificationPreferences.$inferSelect;
export type InsertNotificationPreference = typeof notificationPreferences.$inferInsert;

/**
 * Strategy notification settings table
 * Per-strategy notification toggles for each user
 */
export const strategyNotificationSettings = mysqlTable("strategy_notification_settings", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  strategyId: int("strategyId").notNull(),
  // Notification toggles
  emailEnabled: boolean("emailEnabled").default(true).notNull(),
  pushEnabled: boolean("pushEnabled").default(true).notNull(),
  // Metadata
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type StrategyNotificationSetting = typeof strategyNotificationSettings.$inferSelect;
export type InsertStrategyNotificationSetting = typeof strategyNotificationSettings.$inferInsert;


/**
 * Staging trades table
 * Stores incoming webhook trades for review before approval into the main trades table
 * This provides a two-stage workflow: webhook -> staging -> production
 */
export const stagingTrades = mysqlTable("staging_trades", {
  id: int("id").autoincrement().primaryKey(),
  // Link to the original webhook log
  webhookLogId: int("webhookLogId").notNull(),
  // Strategy info
  strategyId: int("strategyId").notNull(),
  strategySymbol: varchar("strategySymbol", { length: 20 }).notNull(),
  // Trade details (same as trades table)
  entryDate: datetime("entryDate").notNull(),
  exitDate: datetime("exitDate"),
  direction: varchar("direction", { length: 10 }).notNull(), // "Long" or "Short"
  entryPrice: int("entryPrice").notNull(), // Entry price in cents
  exitPrice: int("exitPrice"), // Exit price in cents (null if position still open)
  quantity: int("quantity").notNull().default(1),
  pnl: int("pnl"), // P&L in cents (null if position still open)
  pnlPercent: int("pnlPercent"), // P&L as percentage
  commission: int("commission").default(0).notNull(),
  // Position tracking
  isOpen: boolean("isOpen").default(true).notNull(), // True if this is an open position
  // Review status
  status: mysqlEnum("status", ["pending", "approved", "rejected", "edited"]).default("pending").notNull(),
  // Approval workflow
  reviewedBy: int("reviewedBy"), // User ID who reviewed
  reviewedAt: datetime("reviewedAt"),
  reviewNotes: text("reviewNotes"), // Optional notes from reviewer
  // If edited, store the original values
  originalPayload: text("originalPayload"), // JSON of original values before edit
  // Link to production trade (after approval)
  productionTradeId: int("productionTradeId"), // ID in trades table after approval
  // Metadata
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  webhookIdx: index("idx_staging_trades_webhook").on(table.webhookLogId),
  strategyIdx: index("idx_staging_trades_strategy").on(table.strategyId),
  statusIdx: index("idx_staging_trades_status").on(table.status),
  isOpenIdx: index("idx_staging_trades_is_open").on(table.isOpen),
  createdIdx: index("idx_staging_trades_created").on(table.createdAt),
}));

export type StagingTrade = typeof stagingTrades.$inferSelect;
export type InsertStagingTrade = typeof stagingTrades.$inferInsert;
