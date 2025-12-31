import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  decimal,
  datetime,
  boolean,
  index,
} from "drizzle-orm/mysql-core";

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
  subscriptionTier: mysqlEnum("subscriptionTier", ["free", "pro", "premium"])
    .default("free")
    .notNull(),
  stripeCustomerId: varchar("stripeCustomerId", { length: 255 }),
  stripeSubscriptionId: varchar("stripeSubscriptionId", { length: 255 }),
  subscriptionStatus: varchar("subscriptionStatus", { length: 50 }).default(
    "active"
  ), // active, canceled, past_due
  // User preferences
  startingCapital: int("startingCapital").default(100000).notNull(), // Starting capital in dollars
  contractSize: mysqlEnum("contractSize", ["mini", "micro"])
    .default("micro")
    .notNull(), // Preferred contract size
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
  contractSize: mysqlEnum("contractSize", ["mini", "micro"])
    .default("mini")
    .notNull(), // Contract size: mini/standard or micro
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
export const trades = mysqlTable(
  "trades",
  {
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
    source: mysqlEnum("source", ["csv_import", "webhook", "manual"])
      .default("csv_import")
      .notNull(), // Trade source for validation
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => ({
    strategyIdx: index("idx_trades_strategy").on(table.strategyId),
    isTestIdx: index("idx_trades_is_test").on(table.isTest),
    exitDateIdx: index("idx_trades_exit_date").on(table.exitDate),
    strategyExitIdx: index("idx_trades_strategy_exit").on(
      table.strategyId,
      table.exitDate
    ),
  })
);

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
export const webhookLogs = mysqlTable(
  "webhook_logs",
  {
    id: int("id").autoincrement().primaryKey(),
    // Raw payload for debugging
    payload: text("payload").notNull(), // JSON string of the raw webhook payload
    // Processing status
    status: mysqlEnum("status", [
      "pending",
      "processing",
      "success",
      "failed",
      "duplicate",
    ])
      .default("pending")
      .notNull(),
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
  },
  table => ({
    strategyIdx: index("idx_webhook_logs_strategy").on(table.strategyId),
    statusIdx: index("idx_webhook_logs_status").on(table.status),
    createdIdx: index("idx_webhook_logs_created").on(table.createdAt),
    isTestIdx: index("idx_webhook_logs_is_test").on(table.isTest),
  })
);

export type WebhookLog = typeof webhookLogs.$inferSelect;
export type InsertWebhookLog = typeof webhookLogs.$inferInsert;

/**
 * Broker connections table
 * Stores connected broker accounts for automated trading
 */
export const brokerConnections = mysqlTable(
  "broker_connections",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(), // Owner of this connection
    broker: mysqlEnum("broker", [
      "tradovate",
      "ibkr",
      "tradestation",
      "alpaca",
    ]).notNull(),
    name: varchar("name", { length: 100 }).notNull(), // User-friendly name for this connection
    // Connection status
    status: mysqlEnum("status", [
      "disconnected",
      "connecting",
      "connected",
      "error",
    ])
      .default("disconnected")
      .notNull(),
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
  },
  table => ({
    userIdx: index("idx_broker_connections_user").on(table.userId),
    statusIdx: index("idx_broker_connections_status").on(table.status),
  })
);

export type BrokerConnection = typeof brokerConnections.$inferSelect;
export type InsertBrokerConnection = typeof brokerConnections.$inferInsert;

/**
 * Routing rules table
 * Configures how webhook signals are routed to brokers
 */
export const routingRules = mysqlTable(
  "routing_rules",
  {
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
    quantityMultiplier: decimal("quantityMultiplier", {
      precision: 10,
      scale: 4,
    })
      .default("1.0000")
      .notNull(),
    // Risk controls
    maxPositionSize: int("maxPositionSize"), // Max contracts per trade
    maxDailyLoss: int("maxDailyLoss"), // Max daily loss in cents before stopping
    // Metadata
    priority: int("priority").default(0).notNull(), // Higher = evaluated first
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    userIdx: index("idx_routing_rules_user").on(table.userId),
    brokerIdx: index("idx_routing_rules_broker").on(table.brokerConnectionId),
  })
);

export type RoutingRule = typeof routingRules.$inferSelect;
export type InsertRoutingRule = typeof routingRules.$inferInsert;

/**
 * Execution logs table
 * Records all order execution attempts and results
 */
export const executionLogs = mysqlTable(
  "execution_logs",
  {
    id: int("id").autoincrement().primaryKey(),
    webhookLogId: int("webhookLogId").notNull(), // Link to source webhook
    routingRuleId: int("routingRuleId"), // Which rule triggered this
    brokerConnectionId: int("brokerConnectionId").notNull(),
    // Execution details
    status: mysqlEnum("status", [
      "pending",
      "submitted",
      "filled",
      "partial",
      "rejected",
      "cancelled",
      "error",
    ])
      .default("pending")
      .notNull(),
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
  },
  table => ({
    webhookIdx: index("idx_execution_logs_webhook").on(table.webhookLogId),
    brokerIdx: index("idx_execution_logs_broker").on(table.brokerConnectionId),
    statusIdx: index("idx_execution_logs_status").on(table.status),
  })
);

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
  quantityMultiplier: decimal("quantityMultiplier", {
    precision: 10,
    scale: 4,
  }).default("1.0000"),
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
export const userPaymentSubscriptions = mysqlTable(
  "user_payment_subscriptions",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull().unique(), // One active subscription per user
    tierId: int("tierId").notNull(),
    // Subscription status
    status: mysqlEnum("status", [
      "active",
      "past_due",
      "cancelled",
      "paused",
      "trialing",
    ])
      .default("active")
      .notNull(),
    // Billing cycle
    billingCycle: mysqlEnum("billingCycle", ["monthly", "yearly"])
      .default("monthly")
      .notNull(),
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
  }
);

export type UserPaymentSubscription =
  typeof userPaymentSubscriptions.$inferSelect;
export type InsertUserPaymentSubscription =
  typeof userPaymentSubscriptions.$inferInsert;

/**
 * Payment history table
 * Records all payment transactions (Stripe-ready)
 */
export const paymentHistory = mysqlTable(
  "payment_history",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    subscriptionId: int("subscriptionId"),
    // Payment details
    amount: int("amount").notNull(), // Amount in cents
    currency: varchar("currency", { length: 3 }).default("USD").notNull(),
    status: mysqlEnum("status", ["pending", "succeeded", "failed", "refunded"])
      .default("pending")
      .notNull(),
    // Stripe integration
    stripePaymentIntentId: varchar("stripePaymentIntentId", { length: 100 }),
    stripeInvoiceId: varchar("stripeInvoiceId", { length: 100 }),
    // Receipt info
    receiptUrl: text("receiptUrl"),
    description: text("description"),
    // Metadata
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => ({
    userIdx: index("idx_payment_history_user").on(table.userId),
    statusIdx: index("idx_payment_history_status").on(table.status),
    createdIdx: index("idx_payment_history_created").on(table.createdAt),
  })
);

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
  status: mysqlEnum("status", ["success", "failure"])
    .default("success")
    .notNull(),
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
  status: mysqlEnum("status", [
    "pending",
    "processing",
    "completed",
    "failed",
    "dead",
  ])
    .default("pending")
    .notNull(),
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
  status: mysqlEnum("status", ["unresolved", "resolved", "ignored"])
    .default("unresolved")
    .notNull(),
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
  action: mysqlEnum("action", ["pending", "executed", "skipped", "expired"])
    .default("pending")
    .notNull(),
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
export const openPositions = mysqlTable(
  "open_positions",
  {
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
    status: mysqlEnum("status", ["open", "closing", "closed"])
      .default("open")
      .notNull(),
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
  },
  table => ({
    strategyIdx: index("idx_open_positions_strategy").on(table.strategyId),
    statusIdx: index("idx_open_positions_status").on(table.status),
    strategyStatusIdx: index("idx_open_positions_strategy_status").on(
      table.strategyId,
      table.status
    ),
    isTestIdx: index("idx_open_positions_is_test").on(table.isTest),
  })
);

export type OpenPosition = typeof openPositions.$inferSelect;
export type InsertOpenPosition = typeof openPositions.$inferInsert;

/**
 * Signal types enum for webhook processing
 */
export const signalTypeEnum = [
  "entry",
  "exit",
  "scale_in",
  "scale_out",
] as const;
export type SignalType = (typeof signalTypeEnum)[number];

// Note: notificationPreferences table is defined at the end of this file with updated schema

/**
 * Strategy notification settings table
 * Per-strategy notification toggles for each user
 */
export const strategyNotificationSettings = mysqlTable(
  "strategy_notification_settings",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    strategyId: int("strategyId").notNull(),
    // Notification toggles
    emailEnabled: boolean("emailEnabled").default(true).notNull(),
    pushEnabled: boolean("pushEnabled").default(true).notNull(),
    // Metadata
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  }
);

export type StrategyNotificationSetting =
  typeof strategyNotificationSettings.$inferSelect;
export type InsertStrategyNotificationSetting =
  typeof strategyNotificationSettings.$inferInsert;

/**
 * Staging trades table
 * Stores incoming webhook trades for review before approval into the main trades table
 * This provides a two-stage workflow: webhook -> staging -> production
 */
export const stagingTrades = mysqlTable(
  "staging_trades",
  {
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
    status: mysqlEnum("status", ["pending", "approved", "rejected", "edited"])
      .default("pending")
      .notNull(),
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
  },
  table => ({
    webhookIdx: index("idx_staging_trades_webhook").on(table.webhookLogId),
    strategyIdx: index("idx_staging_trades_strategy").on(table.strategyId),
    statusIdx: index("idx_staging_trades_status").on(table.status),
    isOpenIdx: index("idx_staging_trades_is_open").on(table.isOpen),
    createdIdx: index("idx_staging_trades_created").on(table.createdAt),
  })
);

export type StagingTrade = typeof stagingTrades.$inferSelect;
export type InsertStagingTrade = typeof stagingTrades.$inferInsert;

/**
 * Webhook retry queue table
 * Stores failed webhooks for retry with exponential backoff
 */
export const webhookRetryQueue = mysqlTable(
  "webhook_retry_queue",
  {
    id: int("id").autoincrement().primaryKey(),
    // Original webhook data
    originalPayload: text("originalPayload").notNull(), // JSON string of original webhook payload
    correlationId: varchar("correlationId", { length: 50 }).notNull(),
    strategySymbol: varchar("strategySymbol", { length: 20 }),
    // Retry tracking
    retryCount: int("retryCount").default(0).notNull(),
    maxRetries: int("maxRetries").default(5).notNull(),
    nextRetryAt: datetime("nextRetryAt").notNull(),
    lastError: text("lastError"),
    // Status
    status: mysqlEnum("status", [
      "pending",
      "processing",
      "completed",
      "failed",
      "cancelled",
    ])
      .default("pending")
      .notNull(),
    // Metadata
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
    completedAt: datetime("completedAt"),
  },
  table => ({
    statusIdx: index("idx_retry_queue_status").on(table.status),
    nextRetryIdx: index("idx_retry_queue_next_retry").on(table.nextRetryAt),
    correlationIdx: index("idx_retry_queue_correlation").on(
      table.correlationId
    ),
  })
);

export type WebhookRetryQueueItem = typeof webhookRetryQueue.$inferSelect;
export type InsertWebhookRetryQueueItem = typeof webhookRetryQueue.$inferInsert;

/**
 * User notification preferences table
 * Stores per-user notification settings with mute controls
 */
export const notificationPreferences = mysqlTable("notification_preferences", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  // Global mute
  globalMute: boolean("globalMute").default(false).notNull(),
  // Per-type mute settings
  muteTradeExecuted: boolean("muteTradeExecuted").default(false).notNull(),
  muteTradeError: boolean("muteTradeError").default(false).notNull(),
  mutePositionOpened: boolean("mutePositionOpened").default(false).notNull(),
  mutePositionClosed: boolean("mutePositionClosed").default(false).notNull(),
  muteWebhookFailed: boolean("muteWebhookFailed").default(false).notNull(),
  muteDailyDigest: boolean("muteDailyDigest").default(false).notNull(),
  // Email preferences
  emailEnabled: boolean("emailEnabled").default(true).notNull(),
  emailAddress: varchar("emailAddress", { length: 320 }),
  // In-app preferences
  inAppEnabled: boolean("inAppEnabled").default(true).notNull(),
  soundEnabled: boolean("soundEnabled").default(true).notNull(),
  // Metadata
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type NotificationPreference =
  typeof notificationPreferences.$inferSelect;
export type InsertNotificationPreference =
  typeof notificationPreferences.$inferInsert;

/**
 * Notifications table
 * Stores notification history for users
 */
export const notifications = mysqlTable(
  "notifications",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    // Notification content
    type: mysqlEnum("type", [
      "trade_executed",
      "trade_error",
      "position_opened",
      "position_closed",
      "webhook_failed",
      "daily_digest",
      "system",
    ]).notNull(),
    title: varchar("title", { length: 200 }).notNull(),
    message: text("message").notNull(),
    // Related entities
    strategyId: int("strategyId"),
    tradeId: int("tradeId"),
    webhookLogId: int("webhookLogId"),
    // Status
    read: boolean("read").default(false).notNull(),
    dismissed: boolean("dismissed").default(false).notNull(),
    // Delivery status
    emailSent: boolean("emailSent").default(false).notNull(),
    emailSentAt: datetime("emailSentAt"),
    // Metadata
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => ({
    userIdx: index("idx_notifications_user").on(table.userId),
    typeIdx: index("idx_notifications_type").on(table.type),
    readIdx: index("idx_notifications_read").on(table.read),
    createdIdx: index("idx_notifications_created").on(table.createdAt),
  })
);

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

/**
 * Signal batch table
 * Groups rapid-fire webhook signals for batch processing
 */
export const signalBatches = mysqlTable(
  "signal_batches",
  {
    id: int("id").autoincrement().primaryKey(),
    // Batch identification
    batchId: varchar("batchId", { length: 50 }).notNull().unique(),
    strategySymbol: varchar("strategySymbol", { length: 20 }).notNull(),
    // Batch window
    windowStartAt: datetime("windowStartAt").notNull(),
    windowEndAt: datetime("windowEndAt"),
    // Aggregated data
    signalCount: int("signalCount").default(0).notNull(),
    netDirection: varchar("netDirection", { length: 10 }), // "long", "short", "flat"
    netQuantity: int("netQuantity").default(0).notNull(),
    avgPrice: int("avgPrice"), // Average price in cents
    // Status
    status: mysqlEnum("status", [
      "collecting",
      "processing",
      "completed",
      "failed",
    ])
      .default("collecting")
      .notNull(),
    // Processing result
    resultWebhookLogId: int("resultWebhookLogId"),
    errorMessage: text("errorMessage"),
    // Metadata
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    batchIdx: index("idx_signal_batches_batch").on(table.batchId),
    strategyIdx: index("idx_signal_batches_strategy").on(table.strategySymbol),
    statusIdx: index("idx_signal_batches_status").on(table.status),
  })
);

export type SignalBatch = typeof signalBatches.$inferSelect;
export type InsertSignalBatch = typeof signalBatches.$inferInsert;

/**
 * Webhook Write-Ahead Log (WAL) table
 * Ensures crash-safe webhook processing by persisting webhooks before processing
 */
export const webhookWal = mysqlTable(
  "webhook_wal",
  {
    id: int("id").autoincrement().primaryKey(),
    // Unique identifier for this webhook
    walId: varchar("walId", { length: 64 }).notNull().unique(),
    correlationId: varchar("correlationId", { length: 64 }).notNull(),
    // Raw payload stored for replay capability
    rawPayload: text("rawPayload").notNull(),
    // Parsed fields for quick lookup
    strategySymbol: varchar("strategySymbol", { length: 50 }),
    action: varchar("action", { length: 20 }),
    direction: varchar("direction", { length: 10 }),
    price: int("price"), // in cents
    quantity: int("quantity"),
    // Processing status
    status: mysqlEnum("status", [
      "received",
      "processing",
      "completed",
      "failed",
      "retrying",
    ])
      .default("received")
      .notNull(),
    // Processing metadata
    attempts: int("attempts").default(0).notNull(),
    lastAttemptAt: datetime("lastAttemptAt"),
    completedAt: datetime("completedAt"),
    // Result tracking
    resultWebhookLogId: int("resultWebhookLogId"),
    errorMessage: text("errorMessage"),
    // Source info
    sourceIp: varchar("sourceIp", { length: 45 }),
    userAgent: varchar("userAgent", { length: 255 }),
    // Timestamps
    receivedAt: datetime("receivedAt").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    walIdIdx: index("idx_webhook_wal_wal_id").on(table.walId),
    statusIdx: index("idx_webhook_wal_status").on(table.status),
    correlationIdx: index("idx_webhook_wal_correlation").on(
      table.correlationId
    ),
    receivedAtIdx: index("idx_webhook_wal_received_at").on(table.receivedAt),
  })
);

export type WebhookWal = typeof webhookWal.$inferSelect;
export type InsertWebhookWal = typeof webhookWal.$inferInsert;

/**
 * Broker orders table
 * Tracks order lifecycle from submission to fill/rejection
 */
export const brokerOrders = mysqlTable(
  "broker_orders",
  {
    id: int("id").autoincrement().primaryKey(),
    // Internal references
    webhookLogId: int("webhookLogId"),
    openPositionId: int("openPositionId"),
    tradeId: int("tradeId"),
    // Order identification
    internalOrderId: varchar("internalOrderId", { length: 64 })
      .notNull()
      .unique(),
    brokerOrderId: varchar("brokerOrderId", { length: 64 }), // ID returned by broker
    // Order details
    broker: varchar("broker", { length: 20 }).notNull(), // "ibkr", "tradovate", etc.
    strategySymbol: varchar("strategySymbol", { length: 50 }).notNull(),
    symbol: varchar("symbol", { length: 20 }).notNull(), // Actual trading symbol (MES, NQ, etc.)
    action: mysqlEnum("action", ["buy", "sell"]).notNull(),
    orderType: mysqlEnum("orderType", ["market", "limit", "stop", "stop_limit"])
      .default("market")
      .notNull(),
    quantity: int("quantity").notNull(),
    // Prices (in cents)
    requestedPrice: int("requestedPrice"),
    limitPrice: int("limitPrice"),
    stopPrice: int("stopPrice"),
    // Fill information
    filledQuantity: int("filledQuantity").default(0).notNull(),
    avgFillPrice: int("avgFillPrice"),
    commission: int("commission").default(0), // in cents
    // Status tracking
    status: mysqlEnum("status", [
      "pending", // Created, not yet submitted
      "submitted", // Sent to broker
      "acknowledged", // Broker received
      "working", // Order is live in market
      "partially_filled",
      "filled",
      "cancelled",
      "rejected",
      "expired",
      "error",
    ])
      .default("pending")
      .notNull(),
    // Status messages
    brokerStatus: varchar("brokerStatus", { length: 100 }),
    rejectReason: text("rejectReason"),
    // Timing
    submittedAt: datetime("submittedAt"),
    acknowledgedAt: datetime("acknowledgedAt"),
    filledAt: datetime("filledAt"),
    cancelledAt: datetime("cancelledAt"),
    // Metadata
    isTest: boolean("isTest").default(false).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    internalOrderIdx: index("idx_broker_orders_internal").on(
      table.internalOrderId
    ),
    brokerOrderIdx: index("idx_broker_orders_broker").on(table.brokerOrderId),
    statusIdx: index("idx_broker_orders_status").on(table.status),
    strategyIdx: index("idx_broker_orders_strategy").on(table.strategySymbol),
  })
);

export type BrokerOrder = typeof brokerOrders.$inferSelect;
export type InsertBrokerOrder = typeof brokerOrders.$inferInsert;

/**
 * Position reconciliation log table
 * Tracks discrepancies between database positions and broker positions
 */
export const reconciliationLogs = mysqlTable(
  "reconciliation_logs",
  {
    id: int("id").autoincrement().primaryKey(),
    // Reconciliation run identifier
    reconciliationId: varchar("reconciliationId", { length: 64 }).notNull(),
    runAt: datetime("runAt").notNull(),
    // Broker info
    broker: varchar("broker", { length: 20 }).notNull(),
    accountId: varchar("accountId", { length: 64 }),
    // Position details
    strategySymbol: varchar("strategySymbol", { length: 50 }),
    symbol: varchar("symbol", { length: 20 }).notNull(),
    // Database state
    dbPositionId: int("dbPositionId"),
    dbDirection: varchar("dbDirection", { length: 10 }),
    dbQuantity: int("dbQuantity"),
    dbEntryPrice: int("dbEntryPrice"),
    // Broker state
    brokerDirection: varchar("brokerDirection", { length: 10 }),
    brokerQuantity: int("brokerQuantity"),
    brokerAvgPrice: int("brokerAvgPrice"),
    // Discrepancy details
    discrepancyType: mysqlEnum("discrepancyType", [
      "missing_in_db", // Position exists in broker but not DB
      "missing_in_broker", // Position exists in DB but not broker
      "quantity_mismatch", // Different quantities
      "direction_mismatch", // Different directions (should never happen)
      "price_mismatch", // Significant price difference
      "matched", // No discrepancy
    ]).notNull(),
    discrepancyDetails: text("discrepancyDetails"),
    // Resolution
    resolved: boolean("resolved").default(false).notNull(),
    resolvedAt: datetime("resolvedAt"),
    resolvedBy: varchar("resolvedBy", { length: 100 }),
    resolutionAction: varchar("resolutionAction", { length: 50 }),
    resolutionNotes: text("resolutionNotes"),
    // Timestamps
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    reconciliationIdx: index("idx_reconciliation_run").on(
      table.reconciliationId
    ),
    brokerIdx: index("idx_reconciliation_broker").on(table.broker),
    discrepancyIdx: index("idx_reconciliation_discrepancy").on(
      table.discrepancyType
    ),
    unresolvedIdx: index("idx_reconciliation_unresolved").on(table.resolved),
  })
);

export type ReconciliationLog = typeof reconciliationLogs.$inferSelect;
export type InsertReconciliationLog = typeof reconciliationLogs.$inferInsert;

/**
 * Position adjustments table
 * Tracks manual adjustments to positions for audit trail
 */
export const positionAdjustments = mysqlTable(
  "position_adjustments",
  {
    id: int("id").autoincrement().primaryKey(),
    // Position reference
    openPositionId: int("openPositionId"),
    strategySymbol: varchar("strategySymbol", { length: 50 }).notNull(),
    // Adjustment type
    adjustmentType: mysqlEnum("adjustmentType", [
      "force_close", // Manually close position
      "force_open", // Manually open position
      "quantity_adjust", // Adjust quantity
      "price_adjust", // Adjust entry price
      "sync_from_broker", // Sync from broker state
      "manual_override", // General override
    ]).notNull(),
    // Before state
    beforeDirection: varchar("beforeDirection", { length: 10 }),
    beforeQuantity: int("beforeQuantity"),
    beforeEntryPrice: int("beforeEntryPrice"),
    // After state
    afterDirection: varchar("afterDirection", { length: 10 }),
    afterQuantity: int("afterQuantity"),
    afterEntryPrice: int("afterEntryPrice"),
    // Audit info
    reason: text("reason").notNull(),
    adjustedBy: varchar("adjustedBy", { length: 100 }).notNull(),
    reconciliationLogId: int("reconciliationLogId"),
    // Timestamps
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => ({
    positionIdx: index("idx_position_adjustments_position").on(
      table.openPositionId
    ),
    strategyIdx: index("idx_position_adjustments_strategy").on(
      table.strategySymbol
    ),
    typeIdx: index("idx_position_adjustments_type").on(table.adjustmentType),
  })
);

export type PositionAdjustment = typeof positionAdjustments.$inferSelect;
export type InsertPositionAdjustment = typeof positionAdjustments.$inferInsert;

/**
 * Paper trading accounts table
 * Virtual accounts for simulated trading
 */
export const paperAccounts = mysqlTable(
  "paper_accounts",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    name: varchar("name", { length: 100 }).notNull(),
    // Balance tracking (all in cents)
    balance: int("balance").notNull().default(10000000), // $100,000 default
    startingBalance: int("startingBalance").notNull().default(10000000),
    realizedPnl: int("realizedPnl").default(0),
    // Performance stats
    totalTrades: int("totalTrades").default(0),
    winningTrades: int("winningTrades").default(0),
    losingTrades: int("losingTrades").default(0),
    // Timestamps
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    userIdx: index("idx_paper_accounts_user").on(table.userId),
  })
);

export type PaperAccount = typeof paperAccounts.$inferSelect;
export type InsertPaperAccount = typeof paperAccounts.$inferInsert;

/**
 * Paper positions table
 * Tracks open and closed positions in paper trading
 */
export const paperPositions = mysqlTable(
  "paper_positions",
  {
    id: int("id").autoincrement().primaryKey(),
    accountId: int("accountId").notNull(),
    strategyId: int("strategyId"),
    symbol: varchar("symbol", { length: 20 }).notNull(),
    side: mysqlEnum("side", ["LONG", "SHORT"]).notNull(),
    quantity: int("quantity").notNull(),
    entryPrice: int("entryPrice").notNull(), // in cents
    entryDate: datetime("entryDate").notNull(),
    exitPrice: int("exitPrice"), // in cents
    exitDate: datetime("exitDate"),
    status: mysqlEnum("status", ["open", "closed"]).default("open").notNull(),
    unrealizedPnl: int("unrealizedPnl").default(0),
    realizedPnl: int("realizedPnl").default(0),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    accountIdx: index("idx_paper_positions_account").on(table.accountId),
    statusIdx: index("idx_paper_positions_status").on(table.status),
    symbolIdx: index("idx_paper_positions_symbol").on(table.symbol),
  })
);

export type PaperPosition = typeof paperPositions.$inferSelect;
export type InsertPaperPosition = typeof paperPositions.$inferInsert;

/**
 * Paper trades table
 * Records all paper trading executions
 */
export const paperTrades = mysqlTable(
  "paper_trades",
  {
    id: int("id").autoincrement().primaryKey(),
    accountId: int("accountId").notNull(),
    positionId: int("positionId"),
    strategyId: int("strategyId"),
    symbol: varchar("symbol", { length: 20 }).notNull(),
    side: mysqlEnum("side", ["BUY", "SELL"]).notNull(),
    quantity: int("quantity").notNull(),
    price: int("price").notNull(), // in cents
    orderType: mysqlEnum("orderType", ["MARKET", "LIMIT", "STOP"]).notNull(),
    pnl: int("pnl").default(0), // realized P&L for this trade
    commission: int("commission").default(0), // simulated commission
    executedAt: datetime("executedAt").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => ({
    accountIdx: index("idx_paper_trades_account").on(table.accountId),
    positionIdx: index("idx_paper_trades_position").on(table.positionId),
    executedIdx: index("idx_paper_trades_executed").on(table.executedAt),
  })
);

export type PaperTrade = typeof paperTrades.$inferSelect;
export type InsertPaperTrade = typeof paperTrades.$inferInsert;

/**
 * Contact messages table
 * Stores messages from users/visitors through the contact form
 */
export const contactMessages = mysqlTable(
  "contact_messages",
  {
    id: int("id").autoincrement().primaryKey(),
    // Sender info
    name: varchar("name", { length: 100 }).notNull(),
    email: varchar("email", { length: 320 }).notNull(),
    userId: int("userId"), // Optional - linked user if logged in
    // Message content
    subject: varchar("subject", { length: 200 }).notNull(),
    message: text("message").notNull(),
    category: mysqlEnum("category", [
      "general",
      "support",
      "billing",
      "feature_request",
      "bug_report",
      "partnership",
    ])
      .default("general")
      .notNull(),
    // Status tracking
    status: mysqlEnum("status", [
      "new",
      "read",
      "in_progress",
      "awaiting_response",
      "resolved",
      "closed",
    ])
      .default("new")
      .notNull(),
    priority: mysqlEnum("priority", ["low", "normal", "high", "urgent"])
      .default("normal")
      .notNull(),
    // AI response
    aiSuggestedResponse: text("aiSuggestedResponse"), // LLM-generated response suggestion
    aiResponseGeneratedAt: datetime("aiResponseGeneratedAt"),
    // Metadata
    ipAddress: varchar("ipAddress", { length: 45 }),
    userAgent: text("userAgent"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    statusIdx: index("idx_contact_messages_status").on(table.status),
    emailIdx: index("idx_contact_messages_email").on(table.email),
    createdIdx: index("idx_contact_messages_created").on(table.createdAt),
  })
);

export type ContactMessage = typeof contactMessages.$inferSelect;
export type InsertContactMessage = typeof contactMessages.$inferInsert;

/**
 * Contact responses table
 * Stores responses sent to contact messages
 */
export const contactResponses = mysqlTable(
  "contact_responses",
  {
    id: int("id").autoincrement().primaryKey(),
    messageId: int("messageId").notNull(), // Foreign key to contact_messages
    // Response content
    responseText: text("responseText").notNull(),
    // Approval workflow
    isAiGenerated: boolean("isAiGenerated").default(false).notNull(),
    approvedBy: int("approvedBy"), // User ID who approved (null if not yet approved)
    approvedAt: datetime("approvedAt"),
    // Delivery status
    sentAt: datetime("sentAt"),
    deliveryStatus: mysqlEnum("deliveryStatus", [
      "draft",
      "approved",
      "sent",
      "failed",
    ])
      .default("draft")
      .notNull(),
    errorMessage: text("errorMessage"),
    // Metadata
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => ({
    messageIdx: index("idx_contact_responses_message").on(table.messageId),
    statusIdx: index("idx_contact_responses_status").on(table.deliveryStatus),
  })
);

export type ContactResponse = typeof contactResponses.$inferSelect;
export type InsertContactResponse = typeof contactResponses.$inferInsert;
