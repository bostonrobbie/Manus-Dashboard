import { eq, and, gte, lte, inArray, desc, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from 'mysql2/promise';
import { InsertUser, users, strategies, trades, benchmarks, webhookLogs, InsertWebhookLog, openPositions, InsertOpenPosition, OpenPosition, notificationPreferences, strategyNotificationSettings, InsertNotificationPreference, InsertStrategyNotificationSetting, NotificationPreference, StrategyNotificationSetting, stagingTrades, InsertStagingTrade, StagingTrade } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;
let _pool: mysql.Pool | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      // Create connection pool with resilience options
      _pool = mysql.createPool({
        uri: process.env.DATABASE_URL,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        enableKeepAlive: true,
        keepAliveInitialDelay: 10000, // 10 seconds
      });
      _db = drizzle(_pool as any);
      console.log("[Database] Connection pool created successfully");
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
      _pool = null;
    }
  }
  return _db;
}

// Reset the database connection (useful for recovery from connection errors)
export async function resetDbConnection() {
  if (_pool) {
    try {
      await _pool.end();
    } catch (e) {
      console.warn("[Database] Error closing pool:", e);
    }
  }
  _db = null;
  _pool = null;
  console.log("[Database] Connection reset, will reconnect on next query");
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  // Retry logic for transient database connection errors
  const maxRetries = 3;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const db = await getDb();
    if (!db) {
      console.warn("[Database] Cannot upsert user: database not available");
      return;
    }

    try {
      const values: InsertUser = {
        openId: user.openId,
      };
      const updateSet: Record<string, unknown> = {};

      const textFields = ["name", "email", "loginMethod"] as const;
      type TextField = (typeof textFields)[number];

      const assignNullable = (field: TextField) => {
        const value = user[field];
        if (value === undefined) return;
        const normalized = value ?? null;
        values[field] = normalized;
        updateSet[field] = normalized;
      };

      textFields.forEach(assignNullable);

      if (user.lastSignedIn !== undefined) {
        values.lastSignedIn = user.lastSignedIn;
        updateSet.lastSignedIn = user.lastSignedIn;
      }
      if (user.role !== undefined) {
        values.role = user.role;
        updateSet.role = user.role;
      } else if (user.openId === ENV.ownerOpenId) {
        values.role = 'admin';
        updateSet.role = 'admin';
      }

      if (!values.lastSignedIn) {
        values.lastSignedIn = new Date();
      }

      if (Object.keys(updateSet).length === 0) {
        updateSet.lastSignedIn = new Date();
      }

      await db.insert(users).values(values).onDuplicateKeyUpdate({
        set: updateSet,
      });
      return; // Success, exit retry loop
    } catch (error) {
      lastError = error;
      const errorMessage = error instanceof Error ? error.message : String(error);
      const isRetryable = errorMessage.includes('ECONNRESET') || 
                          errorMessage.includes('ETIMEDOUT') || 
                          errorMessage.includes('ECONNREFUSED');
      
      if (isRetryable && attempt < maxRetries) {
        console.warn(`[Database] Upsert user failed (attempt ${attempt}/${maxRetries}), resetting connection and retrying in ${attempt * 500}ms...`);
        await resetDbConnection(); // Reset connection pool on transient errors
        await new Promise(resolve => setTimeout(resolve, attempt * 500));
      } else {
        console.error("[Database] Failed to upsert user:", error);
        throw error;
      }
    }
  }

  // If we get here, all retries failed
  console.error("[Database] All retry attempts failed for upsert user");
  throw lastError;
}

export async function getUserByOpenId(openId: string) {
  // Retry logic for transient database connection errors
  const maxRetries = 3;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const db = await getDb();
    if (!db) {
      console.warn("[Database] Cannot get user: database not available");
      return undefined;
    }

    try {
      const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
      return result.length > 0 ? result[0] : undefined;
    } catch (error) {
      lastError = error;
      const errorMessage = error instanceof Error ? error.message : String(error);
      const isRetryable = errorMessage.includes('ECONNRESET') || 
                          errorMessage.includes('ETIMEDOUT') || 
                          errorMessage.includes('ECONNREFUSED');
      
      if (isRetryable && attempt < maxRetries) {
        console.warn(`[Database] Get user failed (attempt ${attempt}/${maxRetries}), resetting connection and retrying in ${attempt * 500}ms...`);
        await resetDbConnection(); // Reset connection pool on transient errors
        await new Promise(resolve => setTimeout(resolve, attempt * 500));
      } else {
        console.error("[Database] Failed to get user by openId:", error);
        throw error;
      }
    }
  }

  throw lastError;
}

/**
 * Update user onboarding status
 */
export async function updateUserOnboarding(userId: number, completed: boolean) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot update user onboarding: database not available");
    return;
  }

  await db.update(users).set({ onboardingCompleted: completed }).where(eq(users.id, userId));
}

/**
 * Dismiss user onboarding permanently
 */
export async function dismissUserOnboarding(userId: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot dismiss user onboarding: database not available");
    return;
  }

  await db.update(users).set({ onboardingDismissed: true }).where(eq(users.id, userId));
}

/**
 * Get all strategies
 */
export async function getAllStrategies() {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(strategies).where(eq(strategies.active, true)).orderBy(strategies.id);
}

/**
 * Get strategy by ID
 */
export async function getStrategyById(id: number) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.select().from(strategies).where(eq(strategies.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

/**
 * Get all trades for specific strategies with optional date filtering
 */
export async function getTrades(params: {
  strategyIds?: number[];
  startDate?: Date;
  endDate?: Date;
}) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [];
  
  if (params.strategyIds && params.strategyIds.length > 0) {
    conditions.push(inArray(trades.strategyId, params.strategyIds));
  }
  
  if (params.startDate) {
    conditions.push(gte(trades.exitDate, params.startDate));
  }
  
  if (params.endDate) {
    conditions.push(lte(trades.exitDate, params.endDate));
  }

  if (conditions.length === 0) {
    return await db.select().from(trades);
  }

  return await db.select().from(trades).where(and(...conditions));
}

/**
 * Get benchmark data with optional date filtering
 */
export async function getBenchmarkData(params?: {
  startDate?: Date;
  endDate?: Date;
}) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [];
  
  if (params?.startDate) {
    conditions.push(gte(benchmarks.date, params.startDate));
  }
  
  if (params?.endDate) {
    conditions.push(lte(benchmarks.date, params.endDate));
  }

  if (conditions.length === 0) {
    return await db.select().from(benchmarks);
  }

  return await db.select().from(benchmarks).where(and(...conditions));
}

/**
 * Insert a new trade (for webhook ingestion)
 */
export async function insertTrade(trade: {
  strategyId: number;
  entryDate: Date;
  exitDate: Date;
  direction: string;
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  pnl: number;
  pnlPercent: number;
  commission: number;
}) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const result = await db.insert(trades).values(trade);
  return result;
}


/**
 * Get strategy by symbol (for webhook processing)
 */
export async function getStrategyBySymbol(symbol: string) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.select().from(strategies).where(eq(strategies.symbol, symbol)).limit(1);
  return result.length > 0 ? result[0] : null;
}

/**
 * Insert a webhook log entry
 */
export async function insertWebhookLog(log: InsertWebhookLog) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const result = await db.insert(webhookLogs).values(log);
  return result;
}

/**
 * Update a webhook log entry
 */
export async function updateWebhookLog(id: number, updates: Partial<InsertWebhookLog>) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  await db.update(webhookLogs).set(updates).where(eq(webhookLogs.id, id));
}

/**
 * Get recent webhook logs for display
 */
export async function getWebhookLogs(params?: {
  status?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
} | number) {
  const db = await getDb();
  if (!db) return [];

  // Handle legacy call with just limit number
  if (typeof params === 'number') {
    return await db.select().from(webhookLogs).orderBy(desc(webhookLogs.createdAt)).limit(params);
  }

  const { status, startDate, endDate, limit = 100 } = params || {};
  
  const conditions = [];
  if (status) {
    conditions.push(eq(webhookLogs.status, status as any));
  }
  if (startDate) {
    conditions.push(gte(webhookLogs.createdAt, startDate));
  }
  if (endDate) {
    conditions.push(lte(webhookLogs.createdAt, endDate));
  }

  if (conditions.length > 0) {
    return await db.select().from(webhookLogs)
      .where(and(...conditions))
      .orderBy(desc(webhookLogs.createdAt))
      .limit(limit);
  }

  return await db.select().from(webhookLogs).orderBy(desc(webhookLogs.createdAt)).limit(limit);
}

/**
 * Check if a trade already exists (for duplicate detection)
 */
export async function checkDuplicateTrade(params: {
  strategyId: number;
  entryDate: Date;
  exitDate: Date;
  direction: string;
}) {
  const db = await getDb();
  if (!db) return false;

  // Check for trades with same strategy, entry date, exit date, and direction
  // Allow 1 minute tolerance for timestamp matching
  const entryStart = new Date(params.entryDate.getTime() - 60000);
  const entryEnd = new Date(params.entryDate.getTime() + 60000);
  const exitStart = new Date(params.exitDate.getTime() - 60000);
  const exitEnd = new Date(params.exitDate.getTime() + 60000);

  const result = await db.select().from(trades).where(
    and(
      eq(trades.strategyId, params.strategyId),
      eq(trades.direction, params.direction),
      gte(trades.entryDate, entryStart),
      lte(trades.entryDate, entryEnd),
      gte(trades.exitDate, exitStart),
      lte(trades.exitDate, exitEnd)
    )
  ).limit(1);

  return result.length > 0;
}

/**
 * Get the inserted trade ID (for linking webhook log to trade)
 */
export async function getLastInsertedTradeId(strategyId: number) {
  const db = await getDb();
  if (!db) return null;

  // Get the most recent trade for this strategy
  const result = await db.select({ id: trades.id })
    .from(trades)
    .where(eq(trades.strategyId, strategyId))
    .orderBy(desc(trades.id))
    .limit(1);

  return result.length > 0 ? result[0].id : null;
}


/**
 * Delete a specific webhook log entry
 */
export async function deleteWebhookLog(logId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  try {
    await db.delete(webhookLogs).where(eq(webhookLogs.id, logId));
    return true;
  } catch (error) {
    console.error("[Database] Failed to delete webhook log:", error);
    return false;
  }
}

/**
 * Delete all webhook logs (admin function)
 */
export async function deleteAllWebhookLogs(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  try {
    // Count before deleting using SQL count
    const countResult = await db.select({ count: sql<number>`count(*)` }).from(webhookLogs);
    const count = countResult[0]?.count ?? 0;
    
    if (count === 0) {
      console.log("[Database] No webhook logs to delete");
      return 0;
    }
    
    // Delete all logs
    const result = await db.delete(webhookLogs);
    console.log(`[Database] Deleted ${count} webhook logs`);
    return count;
  } catch (error) {
    console.error("[Database] Failed to delete all webhook logs:", error);
    throw error; // Re-throw to let the caller handle it
  }
}

// In-memory webhook settings (can be moved to database if persistence needed)
let webhookSettings = {
  paused: false,
};

/**
 * Get webhook processing settings
 */
export async function getWebhookSettings(): Promise<{ paused: boolean }> {
  return webhookSettings;
}

/**
 * Update webhook processing settings
 */
export async function updateWebhookSettings(updates: Partial<{ paused: boolean }>): Promise<void> {
  webhookSettings = { ...webhookSettings, ...updates };
}

/**
 * Delete a specific trade (admin function for removing test trades)
 */
export async function deleteTrade(tradeId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  try {
    await db.delete(trades).where(eq(trades.id, tradeId));
    return true;
  } catch (error) {
    console.error("[Database] Failed to delete trade:", error);
    return false;
  }
}

/**
 * Delete trades by IDs (admin function for bulk removal)
 */
export async function deleteTradesByIds(tradeIds: number[]): Promise<number> {
  const db = await getDb();
  if (!db || tradeIds.length === 0) return 0;

  try {
    await db.delete(trades).where(inArray(trades.id, tradeIds));
    return tradeIds.length;
  } catch (error) {
    console.error("[Database] Failed to delete trades:", error);
    return 0;
  }
}

/**
 * Delete all trades for a strategy (for overwrite functionality)
 */
export async function deleteTradesByStrategy(strategyId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  try {
    // Count before deleting
    const countResult = await db.select({ count: sql<number>`count(*)` })
      .from(trades)
      .where(eq(trades.strategyId, strategyId));
    const count = countResult[0]?.count ?? 0;
    
    if (count === 0) {
      return 0;
    }
    
    await db.delete(trades).where(eq(trades.strategyId, strategyId));
    console.log(`[Database] Deleted ${count} trades for strategy ${strategyId}`);
    return count;
  } catch (error) {
    console.error("[Database] Failed to delete trades for strategy:", error);
    throw error;
  }
}

/**
 * Bulk insert trades (for CSV upload)
 */
export async function bulkInsertTrades(tradesToInsert: Array<{
  strategyId: number;
  entryDate: Date;
  exitDate: Date;
  direction: string;
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  pnl: number;
  pnlPercent: number;
  commission: number;
}>): Promise<number> {
  const db = await getDb();
  if (!db || tradesToInsert.length === 0) return 0;

  try {
    // Insert in batches of 100 to avoid query size limits
    const batchSize = 100;
    let inserted = 0;
    
    for (let i = 0; i < tradesToInsert.length; i += batchSize) {
      const batch = tradesToInsert.slice(i, i + batchSize);
      await db.insert(trades).values(batch);
      inserted += batch.length;
    }
    
    console.log(`[Database] Bulk inserted ${inserted} trades`);
    return inserted;
  } catch (error) {
    console.error("[Database] Failed to bulk insert trades:", error);
    throw error;
  }
}

/**
 * Upload trades with overwrite option
 * If overwrite is true, deletes all existing trades for the strategy first
 */
export async function uploadTradesForStrategy(
  strategyId: number,
  tradesToUpload: Array<{
    entryDate: Date;
    exitDate: Date;
    direction: string;
    entryPrice: number;
    exitPrice: number;
    quantity: number;
    pnl: number;
    pnlPercent: number;
    commission: number;
  }>,
  overwrite: boolean = false
): Promise<{ deleted: number; inserted: number }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  let deleted = 0;
  
  // Delete existing trades if overwrite is enabled
  if (overwrite) {
    deleted = await deleteTradesByStrategy(strategyId);
  }
  
  // Add strategyId to each trade
  const tradesWithStrategy = tradesToUpload.map(t => ({
    ...t,
    strategyId,
  }));
  
  // Insert new trades
  const inserted = await bulkInsertTrades(tradesWithStrategy);
  
  return { deleted, inserted };
}

// ============================================
// Open Positions Management (Persistent Trade Tracking)
// ============================================

/**
 * Create a new open position when an entry signal is received
 */
export async function createOpenPosition(position: InsertOpenPosition): Promise<number | null> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  try {
    const result = await db.insert(openPositions).values(position);
    // MySQL returns insertId in the result
    const insertId = (result as any)[0]?.insertId || (result as any).insertId;
    return insertId || null;
  } catch (error) {
    console.error("[Database] Failed to create open position:", error);
    throw error;
  }
}

/**
 * Get open position for a strategy (there should only be one open position per strategy at a time)
 */
export async function getOpenPositionByStrategy(strategySymbol: string): Promise<OpenPosition | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select()
    .from(openPositions)
    .where(
      and(
        eq(openPositions.strategySymbol, strategySymbol),
        eq(openPositions.status, 'open')
      )
    )
    .orderBy(desc(openPositions.createdAt))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

/**
 * Get open position by ID
 */
export async function getOpenPositionById(id: number): Promise<OpenPosition | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select()
    .from(openPositions)
    .where(eq(openPositions.id, id))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

/**
 * Get all open positions (for dashboard display)
 */
export async function getAllOpenPositions(): Promise<OpenPosition[]> {
  const db = await getDb();
  if (!db) return [];

  return await db.select()
    .from(openPositions)
    .where(eq(openPositions.status, 'open'))
    .orderBy(desc(openPositions.entryTime));
}

/**
 * Get all positions (open and recently closed) for dashboard
 */
export async function getRecentPositions(limit: number = 50): Promise<OpenPosition[]> {
  const db = await getDb();
  if (!db) return [];

  return await db.select()
    .from(openPositions)
    .orderBy(desc(openPositions.updatedAt))
    .limit(limit);
}

/**
 * Close an open position when an exit signal is received
 */
export async function closeOpenPosition(
  positionId: number,
  exitData: {
    exitPrice: number;
    exitTime: Date;
    exitWebhookLogId?: number;
    pnl: number;
    tradeId?: number;
  }
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  try {
    await db.update(openPositions)
      .set({
        status: 'closed',
        exitPrice: exitData.exitPrice,
        exitTime: exitData.exitTime,
        exitWebhookLogId: exitData.exitWebhookLogId,
        pnl: exitData.pnl,
        tradeId: exitData.tradeId,
      })
      .where(eq(openPositions.id, positionId));
    return true;
  } catch (error) {
    console.error("[Database] Failed to close open position:", error);
    return false;
  }
}

/**
 * Delete an open position (admin function)
 */
export async function deleteOpenPosition(positionId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  try {
    await db.delete(openPositions).where(eq(openPositions.id, positionId));
    return true;
  } catch (error) {
    console.error("[Database] Failed to delete open position:", error);
    return false;
  }
}

/**
 * Clear all open positions for a strategy (admin function)
 */
export async function clearOpenPositionsForStrategy(strategySymbol: string): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  try {
    const result = await db.delete(openPositions)
      .where(eq(openPositions.strategySymbol, strategySymbol));
    return (result as any).affectedRows || 0;
  } catch (error) {
    console.error("[Database] Failed to clear open positions:", error);
    return 0;
  }
}

/**
 * Get position counts by status for dashboard stats
 */
export async function getPositionStats(): Promise<{
  open: number;
  closedToday: number;
  totalPnlToday: number;
}> {
  const db = await getDb();
  if (!db) return { open: 0, closedToday: 0, totalPnlToday: 0 };

  try {
    // Get open positions count
    const openResult = await db.select()
      .from(openPositions)
      .where(eq(openPositions.status, 'open'));
    
    // Get today's closed positions
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const closedResult = await db.select()
      .from(openPositions)
      .where(
        and(
          eq(openPositions.status, 'closed'),
          gte(openPositions.exitTime!, today)
        )
      );
    
    // Calculate total P&L for today
    const totalPnlToday = closedResult.reduce((sum, pos) => sum + (pos.pnl || 0), 0);
    
    return {
      open: openResult.length,
      closedToday: closedResult.length,
      totalPnlToday,
    };
  } catch (error) {
    console.error("[Database] Failed to get position stats:", error);
    return { open: 0, closedToday: 0, totalPnlToday: 0 };
  }
}


// ============================================================================
// Notification Preferences Functions
// ============================================================================

/**
 * Get notification preferences for a user
 */
export async function getNotificationPreferences(userId: number): Promise<NotificationPreference | null> {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.select().from(notificationPreferences).where(eq(notificationPreferences.userId, userId)).limit(1);
  return result[0] || null;
}

/**
 * Create or update notification preferences for a user
 */
export async function upsertNotificationPreferences(userId: number, prefs: Partial<InsertNotificationPreference>): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  const existing = await getNotificationPreferences(userId);
  
  if (existing) {
    await db.update(notificationPreferences)
      .set({ ...prefs, updatedAt: new Date() })
      .where(eq(notificationPreferences.userId, userId));
  } else {
    await db.insert(notificationPreferences).values({
      userId,
      emailNotificationsEnabled: prefs.emailNotificationsEnabled ?? true,
      pushNotificationsEnabled: prefs.pushNotificationsEnabled ?? true,
      notifyOnEntry: prefs.notifyOnEntry ?? true,
      notifyOnExit: prefs.notifyOnExit ?? true,
      notifyOnProfit: prefs.notifyOnProfit ?? true,
      notifyOnLoss: prefs.notifyOnLoss ?? true,
      quietHoursStart: prefs.quietHoursStart,
      quietHoursEnd: prefs.quietHoursEnd,
      quietHoursTimezone: prefs.quietHoursTimezone ?? 'America/New_York',
    });
  }
}

/**
 * Get strategy notification settings for a user
 */
export async function getStrategyNotificationSettings(userId: number): Promise<StrategyNotificationSetting[]> {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(strategyNotificationSettings).where(eq(strategyNotificationSettings.userId, userId));
}

/**
 * Get notification setting for a specific strategy
 */
export async function getStrategyNotificationSetting(userId: number, strategyId: number): Promise<StrategyNotificationSetting | null> {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.select().from(strategyNotificationSettings)
    .where(and(
      eq(strategyNotificationSettings.userId, userId),
      eq(strategyNotificationSettings.strategyId, strategyId)
    ))
    .limit(1);
  
  return result[0] || null;
}

/**
 * Update notification setting for a specific strategy
 */
export async function upsertStrategyNotificationSetting(
  userId: number, 
  strategyId: number, 
  settings: { emailEnabled?: boolean; pushEnabled?: boolean }
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  const existing = await getStrategyNotificationSetting(userId, strategyId);
  
  if (existing) {
    await db.update(strategyNotificationSettings)
      .set({ ...settings, updatedAt: new Date() })
      .where(and(
        eq(strategyNotificationSettings.userId, userId),
        eq(strategyNotificationSettings.strategyId, strategyId)
      ));
  } else {
    await db.insert(strategyNotificationSettings).values({
      userId,
      strategyId,
      emailEnabled: settings.emailEnabled ?? true,
      pushEnabled: settings.pushEnabled ?? true,
    });
  }
}

/**
 * Check if notifications are enabled for a user and strategy
 * Returns true if notifications should be sent
 */
export async function shouldSendNotification(
  userId: number, 
  strategyId: number, 
  type: 'entry' | 'exit' | 'profit' | 'loss'
): Promise<{ email: boolean; push: boolean }> {
  const prefs = await getNotificationPreferences(userId);
  const strategySettings = await getStrategyNotificationSetting(userId, strategyId);
  
  // Default to enabled if no preferences set
  if (!prefs) {
    return { email: true, push: true };
  }
  
  // Check global toggles
  const globalEmailEnabled = prefs.emailNotificationsEnabled;
  const globalPushEnabled = prefs.pushNotificationsEnabled;
  
  // Check type-specific toggles
  let typeEnabled = true;
  switch (type) {
    case 'entry':
      typeEnabled = prefs.notifyOnEntry;
      break;
    case 'exit':
      typeEnabled = prefs.notifyOnExit;
      break;
    case 'profit':
      typeEnabled = prefs.notifyOnProfit;
      break;
    case 'loss':
      typeEnabled = prefs.notifyOnLoss;
      break;
  }
  
  // Check strategy-specific settings (default to enabled if not set)
  const strategyEmailEnabled = strategySettings?.emailEnabled ?? true;
  const strategyPushEnabled = strategySettings?.pushEnabled ?? true;
  
  return {
    email: globalEmailEnabled && typeEnabled && strategyEmailEnabled,
    push: globalPushEnabled && typeEnabled && strategyPushEnabled,
  };
}

/**
 * Get all strategies with their notification settings for a user
 */
export async function getStrategiesWithNotificationSettings(userId: number): Promise<Array<{
  id: number;
  symbol: string;
  name: string;
  emailEnabled: boolean;
  pushEnabled: boolean;
}>> {
  const db = await getDb();
  if (!db) return [];
  
  const allStrategies = await db.select().from(strategies).where(eq(strategies.active, true));
  const userSettings = await getStrategyNotificationSettings(userId);
  
  // Create a map of strategy settings
  const settingsMap = new Map(userSettings.map(s => [s.strategyId, s]));
  
  return allStrategies.map(strategy => ({
    id: strategy.id,
    symbol: strategy.symbol,
    name: strategy.name,
    emailEnabled: settingsMap.get(strategy.id)?.emailEnabled ?? true,
    pushEnabled: settingsMap.get(strategy.id)?.pushEnabled ?? true,
  }));
}


// ============================================================================
// Staging Trades Functions (Webhook Review Workflow)
// ============================================================================

/**
 * Create a new staging trade from a webhook
 */
export async function createStagingTrade(trade: {
  webhookLogId: number;
  strategyId: number;
  strategySymbol: string;
  entryDate: Date;
  exitDate?: Date;
  direction: string;
  entryPrice: number;
  exitPrice?: number;
  quantity: number;
  pnl?: number;
  pnlPercent?: number;
  commission?: number;
  isOpen?: boolean;
}): Promise<number | null> {
  const db = await getDb();
  if (!db) return null;

  try {
    const result = await db.insert(stagingTrades).values({
      webhookLogId: trade.webhookLogId,
      strategyId: trade.strategyId,
      strategySymbol: trade.strategySymbol,
      entryDate: trade.entryDate,
      exitDate: trade.exitDate || null,
      direction: trade.direction,
      entryPrice: trade.entryPrice,
      exitPrice: trade.exitPrice || null,
      quantity: trade.quantity,
      pnl: trade.pnl || null,
      pnlPercent: trade.pnlPercent || null,
      commission: trade.commission || 0,
      isOpen: trade.isOpen ?? !trade.exitDate,
      status: 'pending',
    });
    
    // Get the inserted ID
    const insertedId = (result as any)[0]?.insertId;
    return insertedId || null;
  } catch (error) {
    console.error("[Database] Failed to create staging trade:", error);
    return null;
  }
}

/**
 * Get all staging trades with optional filters
 */
export async function getStagingTrades(params?: {
  status?: 'pending' | 'approved' | 'rejected' | 'edited';
  strategyId?: number;
  isOpen?: boolean;
  limit?: number;
}): Promise<StagingTrade[]> {
  const db = await getDb();
  if (!db) return [];

  const { status, strategyId, isOpen, limit = 100 } = params || {};
  
  const conditions = [];
  if (status) {
    conditions.push(eq(stagingTrades.status, status));
  }
  if (strategyId !== undefined) {
    conditions.push(eq(stagingTrades.strategyId, strategyId));
  }
  if (isOpen !== undefined) {
    conditions.push(eq(stagingTrades.isOpen, isOpen));
  }

  if (conditions.length > 0) {
    return await db.select().from(stagingTrades)
      .where(and(...conditions))
      .orderBy(desc(stagingTrades.createdAt))
      .limit(limit);
  }

  return await db.select().from(stagingTrades)
    .orderBy(desc(stagingTrades.createdAt))
    .limit(limit);
}

/**
 * Get a single staging trade by ID
 */
export async function getStagingTradeById(id: number): Promise<StagingTrade | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(stagingTrades)
    .where(eq(stagingTrades.id, id))
    .limit(1);
  
  return result[0] || null;
}

/**
 * Approve a staging trade and move it to production
 */
export async function approveStagingTrade(
  stagingTradeId: number,
  reviewedBy: number,
  reviewNotes?: string
): Promise<{ success: boolean; productionTradeId?: number; error?: string }> {
  const db = await getDb();
  if (!db) return { success: false, error: 'Database not available' };

  try {
    // Get the staging trade
    const stagingTrade = await getStagingTradeById(stagingTradeId);
    if (!stagingTrade) {
      return { success: false, error: 'Staging trade not found' };
    }

    if (stagingTrade.status !== 'pending' && stagingTrade.status !== 'edited') {
      return { success: false, error: `Cannot approve trade with status: ${stagingTrade.status}` };
    }

    // Only approve closed trades (with exit data)
    if (stagingTrade.isOpen || !stagingTrade.exitDate || !stagingTrade.exitPrice) {
      return { success: false, error: 'Cannot approve open positions. Wait for exit signal.' };
    }

    // Insert into production trades table
    const insertResult = await db.insert(trades).values({
      strategyId: stagingTrade.strategyId,
      entryDate: stagingTrade.entryDate,
      exitDate: stagingTrade.exitDate,
      direction: stagingTrade.direction,
      entryPrice: stagingTrade.entryPrice,
      exitPrice: stagingTrade.exitPrice,
      quantity: stagingTrade.quantity,
      pnl: stagingTrade.pnl || 0,
      pnlPercent: stagingTrade.pnlPercent || 0,
      commission: stagingTrade.commission,
    });

    const productionTradeId = (insertResult as any)[0]?.insertId;

    // Update staging trade status
    await db.update(stagingTrades)
      .set({
        status: 'approved',
        reviewedBy,
        reviewedAt: new Date(),
        reviewNotes,
        productionTradeId,
      })
      .where(eq(stagingTrades.id, stagingTradeId));

    console.log(`[Database] Approved staging trade ${stagingTradeId} -> production trade ${productionTradeId}`);
    return { success: true, productionTradeId };
  } catch (error) {
    console.error("[Database] Failed to approve staging trade:", error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Reject a staging trade
 */
export async function rejectStagingTrade(
  stagingTradeId: number,
  reviewedBy: number,
  reviewNotes?: string
): Promise<{ success: boolean; error?: string }> {
  const db = await getDb();
  if (!db) return { success: false, error: 'Database not available' };

  try {
    const stagingTrade = await getStagingTradeById(stagingTradeId);
    if (!stagingTrade) {
      return { success: false, error: 'Staging trade not found' };
    }

    await db.update(stagingTrades)
      .set({
        status: 'rejected',
        reviewedBy,
        reviewedAt: new Date(),
        reviewNotes,
      })
      .where(eq(stagingTrades.id, stagingTradeId));

    console.log(`[Database] Rejected staging trade ${stagingTradeId}`);
    return { success: true };
  } catch (error) {
    console.error("[Database] Failed to reject staging trade:", error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Edit a staging trade (for corrections before approval)
 */
export async function editStagingTrade(
  stagingTradeId: number,
  reviewedBy: number,
  updates: {
    entryDate?: Date;
    exitDate?: Date;
    direction?: string;
    entryPrice?: number;
    exitPrice?: number;
    quantity?: number;
    pnl?: number;
    pnlPercent?: number;
    commission?: number;
  },
  reviewNotes?: string
): Promise<{ success: boolean; error?: string }> {
  const db = await getDb();
  if (!db) return { success: false, error: 'Database not available' };

  try {
    const stagingTrade = await getStagingTradeById(stagingTradeId);
    if (!stagingTrade) {
      return { success: false, error: 'Staging trade not found' };
    }

    // Store original values before edit
    const originalPayload = JSON.stringify({
      entryDate: stagingTrade.entryDate,
      exitDate: stagingTrade.exitDate,
      direction: stagingTrade.direction,
      entryPrice: stagingTrade.entryPrice,
      exitPrice: stagingTrade.exitPrice,
      quantity: stagingTrade.quantity,
      pnl: stagingTrade.pnl,
      pnlPercent: stagingTrade.pnlPercent,
      commission: stagingTrade.commission,
    });

    await db.update(stagingTrades)
      .set({
        ...updates,
        status: 'edited',
        reviewedBy,
        reviewedAt: new Date(),
        reviewNotes,
        originalPayload: stagingTrade.originalPayload || originalPayload,
        isOpen: updates.exitDate ? false : stagingTrade.isOpen,
      })
      .where(eq(stagingTrades.id, stagingTradeId));

    console.log(`[Database] Edited staging trade ${stagingTradeId}`);
    return { success: true };
  } catch (error) {
    console.error("[Database] Failed to edit staging trade:", error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Delete a staging trade permanently
 */
export async function deleteStagingTrade(stagingTradeId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  try {
    await db.delete(stagingTrades).where(eq(stagingTrades.id, stagingTradeId));
    console.log(`[Database] Deleted staging trade ${stagingTradeId}`);
    return true;
  } catch (error) {
    console.error("[Database] Failed to delete staging trade:", error);
    return false;
  }
}

/**
 * Get staging trade statistics
 */
export async function getStagingTradeStats(): Promise<{
  pending: number;
  approved: number;
  rejected: number;
  edited: number;
  openPositions: number;
}> {
  const db = await getDb();
  if (!db) return { pending: 0, approved: 0, rejected: 0, edited: 0, openPositions: 0 };

  try {
    const allTrades = await db.select().from(stagingTrades);
    
    return {
      pending: allTrades.filter(t => t.status === 'pending').length,
      approved: allTrades.filter(t => t.status === 'approved').length,
      rejected: allTrades.filter(t => t.status === 'rejected').length,
      edited: allTrades.filter(t => t.status === 'edited').length,
      openPositions: allTrades.filter(t => t.isOpen).length,
    };
  } catch (error) {
    console.error("[Database] Failed to get staging trade stats:", error);
    return { pending: 0, approved: 0, rejected: 0, edited: 0, openPositions: 0 };
  }
}

/**
 * Update staging trade when exit signal is received
 */
export async function updateStagingTradeExit(
  strategySymbol: string,
  direction: string,
  exitData: {
    exitDate: Date;
    exitPrice: number;
    pnl: number;
    pnlPercent: number;
  }
): Promise<{ success: boolean; stagingTradeId?: number; error?: string }> {
  const db = await getDb();
  if (!db) return { success: false, error: 'Database not available' };

  try {
    // Find the open staging trade for this strategy and direction
    const openTrades = await db.select().from(stagingTrades)
      .where(and(
        eq(stagingTrades.strategySymbol, strategySymbol),
        eq(stagingTrades.direction, direction),
        eq(stagingTrades.isOpen, true),
        eq(stagingTrades.status, 'pending')
      ))
      .orderBy(desc(stagingTrades.createdAt))
      .limit(1);

    if (openTrades.length === 0) {
      return { success: false, error: 'No open staging trade found for this strategy' };
    }

    const openTrade = openTrades[0];

    // Update with exit data
    await db.update(stagingTrades)
      .set({
        exitDate: exitData.exitDate,
        exitPrice: exitData.exitPrice,
        pnl: exitData.pnl,
        pnlPercent: exitData.pnlPercent,
        isOpen: false,
      })
      .where(eq(stagingTrades.id, openTrade.id));

    console.log(`[Database] Updated staging trade ${openTrade.id} with exit data`);
    return { success: true, stagingTradeId: openTrade.id };
  } catch (error) {
    console.error("[Database] Failed to update staging trade exit:", error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}
