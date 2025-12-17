import { eq, and, gte, lte, inArray, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from 'mysql2/promise';
import { InsertUser, users, strategies, trades, benchmarks, webhookLogs, InsertWebhookLog } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      const pool = mysql.createPool(process.env.DATABASE_URL);
      _db = drizzle(pool as any);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

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
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
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
export async function getWebhookLogs(limit: number = 100) {
  const db = await getDb();
  if (!db) return [];

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
    // Count before deleting
    const countResult = await db.select({ count: webhookLogs.id }).from(webhookLogs);
    const count = countResult.length;
    
    // Delete all
    await db.delete(webhookLogs);
    return count;
  } catch (error) {
    console.error("[Database] Failed to delete all webhook logs:", error);
    return 0;
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
