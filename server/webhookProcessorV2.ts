/**
 * Robust Webhook Processor V2
 * 
 * Enhanced webhook processing with:
 * - Database transactions for atomic operations
 * - Write-Ahead Log (WAL) integration for crash recovery
 * - Retry logic for transient failures
 * - Comprehensive error handling and logging
 * 
 * This module provides a more reliable alternative to the original webhookService.ts
 * with better guarantees for data consistency.
 */

import mysql from 'mysql2/promise';
import { getPool } from './db';
import { 
  writeToWal, 
  markProcessing, 
  markCompleted, 
  markFailed,
  getWalEntry 
} from './webhookWal';
import {
  validatePayload,
  mapSymbolToStrategy,
  NormalizedPayload,
  WebhookResult,
  calculatePnL,
} from './webhookService';
import { 
  getStrategyBySymbol,
  getOpenPositionByStrategy,
  getWebhookSettings,
} from './db';
import { notifyOwnerAsync } from './_core/notification';
import { cache } from './cache';

// Correlation ID generator
function generateCorrelationId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `wh_${timestamp}_${random}`;
}

// Structured logging
interface LogContext {
  correlationId: string;
  walId?: string;
  strategySymbol?: string;
  signalType?: string;
  [key: string]: unknown;
}

function log(level: 'info' | 'warn' | 'error', message: string, context: LogContext) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...context,
  };
  console[level](`[WebhookProcessorV2] ${JSON.stringify(entry)}`);
}

/**
 * Check database health
 */
async function checkDatabaseHealth(): Promise<boolean> {
  const pool = getPool();
  if (!pool) {
    return false;
  }
  
  try {
    const connection = await pool.getConnection();
    try {
      await connection.ping();
      return true;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('[Database] Health check failed:', error);
    return false;
  }
}

/**
 * Execute a function within a database transaction
 */
async function withTransaction<T>(
  fn: (connection: mysql.PoolConnection) => Promise<T>
): Promise<T> {
  const pool = getPool();
  if (!pool) {
    throw new Error('[Transaction] Database pool not available');
  }
  
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    log('info', 'Transaction started', { correlationId: 'system' });
    
    const result = await fn(connection);
    
    await connection.commit();
    log('info', 'Transaction committed', { correlationId: 'system' });
    
    return result;
  } catch (error) {
    await connection.rollback();
    log('error', 'Transaction rolled back', { correlationId: 'system', error: String(error) });
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * Retry wrapper for database operations
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelayMs: number = 500
): Promise<T> {
  let lastError: unknown;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      const isRetryable = 
        errorMessage.includes('ECONNRESET') ||
        errorMessage.includes('ETIMEDOUT') ||
        errorMessage.includes('ECONNREFUSED') ||
        errorMessage.includes('Connection lost') ||
        errorMessage.includes('ER_LOCK_DEADLOCK') ||
        errorMessage.includes('ER_LOCK_WAIT_TIMEOUT');
      
      if (isRetryable && attempt < maxRetries) {
        const delay = baseDelayMs * Math.pow(2, attempt - 1);
        console.warn(`[Retry] Attempt ${attempt}/${maxRetries} failed, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }
  
  throw lastError;
}

/**
 * Process a webhook with full reliability guarantees
 */
export async function processWebhookRobust(
  rawPayload: unknown,
  ipAddress?: string,
  userAgent?: string
): Promise<WebhookResult> {
  const correlationId = generateCorrelationId();
  const startTime = Date.now();
  let walId: string | undefined;
  
  const logCtx: LogContext = { correlationId };
  
  try {
    // Step 1: Health check
    const isHealthy = await checkDatabaseHealth();
    if (!isHealthy) {
      log('error', 'Database health check failed', logCtx);
      return {
        success: false,
        logId: 0,
        message: 'Service temporarily unavailable',
        error: 'DATABASE_UNAVAILABLE',
        processingTimeMs: Date.now() - startTime,
      };
    }
    
    // Step 2: Check if processing is paused
    const settings = await getWebhookSettings();
    if (settings?.paused) {
      log('warn', 'Webhook processing is paused', logCtx);
      return {
        success: false,
        logId: 0,
        message: 'Webhook processing is currently paused',
        error: 'PROCESSING_PAUSED',
        processingTimeMs: Date.now() - startTime,
      };
    }
    
    // Step 3: Write to WAL before any processing
    const payloadStr = JSON.stringify(rawPayload);
    let parsedPreview: { strategySymbol?: string; action?: string; direction?: string; price?: number; quantity?: number } = {};
    
    try {
      const p = rawPayload as Record<string, unknown>;
      parsedPreview = {
        strategySymbol: mapSymbolToStrategy(String(p.symbol || p.strategy || '')),
        action: String(p.data || p.action || ''),
        direction: String(p.direction || ''),
        price: Number(p.price) || undefined,
        quantity: Number(p.quantity) || undefined,
      };
    } catch {
      // Ignore parsing errors for preview
    }
    
    walId = await withRetry(async () => {
      return await writeToWal({
        correlationId,
        rawPayload: payloadStr,
        parsedPayload: parsedPreview,
        sourceIp: ipAddress,
        userAgent,
      });
    });
    
    logCtx.walId = walId;
    log('info', 'Webhook written to WAL', logCtx);
    
    // Step 4: Mark as processing
    await markProcessing(walId);
    
    // Step 5: Validate payload
    let payload: NormalizedPayload;
    try {
      payload = validatePayload(rawPayload);
      logCtx.strategySymbol = payload.strategySymbol;
      logCtx.signalType = payload.signalType;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Validation failed';
      await markFailed(walId, errorMessage);
      log('warn', 'Payload validation failed', { ...logCtx, error: errorMessage });
      
      return {
        success: false,
        logId: 0,
        message: 'Webhook validation failed',
        error: errorMessage,
        processingTimeMs: Date.now() - startTime,
      };
    }
    
    // Step 6: Find strategy
    const strategy = await getStrategyBySymbol(payload.strategySymbol);
    if (!strategy) {
      const errorMessage = `Unknown strategy: ${payload.strategySymbol}`;
      await markFailed(walId, errorMessage);
      log('warn', 'Unknown strategy', logCtx);
      
      return {
        success: false,
        logId: 0,
        message: errorMessage,
        error: 'UNKNOWN_STRATEGY',
        processingTimeMs: Date.now() - startTime,
      };
    }
    
    // Step 7: Determine signal type and process
    const isEntrySignal = payload.signalType === 'entry' || 
                          (payload.action === 'buy' || payload.action === 'sell') && 
                          payload.marketPosition !== 'flat';
    
    const isExitSignal = payload.signalType === 'exit' || 
                         payload.action === 'exit' || 
                         payload.marketPosition === 'flat';
    
    let result: WebhookResult;
    
    if (isEntrySignal && !isExitSignal) {
      result = await processEntrySignalWithTransaction(
        walId,
        correlationId,
        payload,
        strategy,
        startTime,
        ipAddress
      );
    } else if (isExitSignal) {
      result = await processExitSignalWithTransaction(
        walId,
        correlationId,
        payload,
        strategy,
        startTime,
        ipAddress
      );
    } else {
      // Ambiguous signal - check existing positions
      const existingPosition = await getOpenPositionByStrategy(payload.strategySymbol);
      
      if (existingPosition) {
        result = await processExitSignalWithTransaction(
          walId,
          correlationId,
          payload,
          strategy,
          startTime,
          ipAddress
        );
      } else {
        result = await processEntrySignalWithTransaction(
          walId,
          correlationId,
          payload,
          strategy,
          startTime,
          ipAddress
        );
      }
    }
    
    // Step 8: Update WAL with result
    if (result.success) {
      await markCompleted(walId, result.logId);
      log('info', 'Webhook processed successfully', { ...logCtx, result });
    } else {
      await markFailed(walId, result.error || 'Processing failed');
      log('warn', 'Webhook processing failed', { ...logCtx, result });
    }
    
    return result;
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Try to mark WAL as failed
    if (walId) {
      try {
        await markFailed(walId, errorMessage);
      } catch {
        // Ignore WAL update errors
      }
    }
    
    log('error', 'Webhook processing error', { ...logCtx, error: errorMessage });
    
    return {
      success: false,
      logId: 0,
      message: 'Webhook processing failed',
      error: errorMessage,
      processingTimeMs: Date.now() - startTime,
    };
  }
}

/**
 * Process entry signal with database transaction
 */
async function processEntrySignalWithTransaction(
  walId: string,
  correlationId: string,
  payload: NormalizedPayload,
  strategy: { id: number; symbol: string },
  startTime: number,
  ipAddress?: string
): Promise<WebhookResult> {
  // Check for existing open position first (outside transaction for read)
  const existingPosition = await getOpenPositionByStrategy(payload.strategySymbol);
  
  if (existingPosition) {
    return {
      success: false,
      logId: 0,
      positionId: existingPosition.id,
      message: `Position already open for ${payload.strategySymbol}`,
      error: 'POSITION_EXISTS',
      processingTimeMs: Date.now() - startTime,
      signalType: 'entry',
    };
  }
  
  // Use transaction for atomic insert
  return await withTransaction(async (connection) => {
    const isTestWebhook = payload.isTest;
    
    // Insert webhook log
    const [logResult] = await connection.execute(
      `INSERT INTO webhook_logs (payload, status, strategyId, strategySymbol, direction, entryPrice, entryTime, ipAddress, isTest, createdAt)
       VALUES (?, 'processing', ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        JSON.stringify({ ...payload, correlationId, walId }),
        strategy.id,
        payload.strategySymbol,
        payload.direction,
        Math.round(payload.price * 100),
        payload.timestamp,
        ipAddress || null,
        isTestWebhook,
      ]
    );
    const logId = (logResult as mysql.ResultSetHeader).insertId;
    
    // Insert open position
    const [posResult] = await connection.execute(
      `INSERT INTO open_positions (strategyId, strategySymbol, direction, entryPrice, quantity, entryTime, entryWebhookLogId, status, isTest, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'open', ?, NOW(), NOW())`,
      [
        strategy.id,
        payload.strategySymbol,
        payload.direction,
        Math.round(payload.price * 100),
        payload.quantity,
        payload.timestamp,
        logId,
        isTestWebhook,
      ]
    );
    const positionId = (posResult as mysql.ResultSetHeader).insertId;
    
    // Update webhook log with success
    await connection.execute(
      `UPDATE webhook_logs SET status = 'success', processingTimeMs = ? WHERE id = ?`,
      [Date.now() - startTime, logId]
    );
    
    // Send notification (async, non-blocking)
    notifyOwnerAsync({
      title: `📈 ${payload.direction} Entry: ${payload.strategySymbol}`,
      content: `New ${payload.direction.toLowerCase()} position opened\n\n` +
        `**Strategy:** ${payload.strategySymbol}\n` +
        `**Direction:** ${payload.direction}\n` +
        `**Entry Price:** $${payload.price.toFixed(2)}\n` +
        `**Quantity:** ${payload.quantity} contract${payload.quantity !== 1 ? 's' : ''}\n` +
        `**Time:** ${payload.timestamp.toLocaleString()}`
    });
    
    return {
      success: true,
      logId,
      positionId,
      message: `Entry signal logged: ${payload.strategySymbol} ${payload.direction} @ $${payload.price.toFixed(2)}`,
      processingTimeMs: Date.now() - startTime,
      signalType: 'entry',
    };
  });
}

/**
 * Process exit signal with database transaction
 * Atomically: create trade + close position + update webhook log
 */
async function processExitSignalWithTransaction(
  walId: string,
  correlationId: string,
  payload: NormalizedPayload,
  strategy: { id: number; symbol: string },
  startTime: number,
  ipAddress?: string
): Promise<WebhookResult> {
  // Find open position first (outside transaction for read)
  const openPosition = await getOpenPositionByStrategy(payload.strategySymbol);
  
  if (!openPosition) {
    return {
      success: false,
      logId: 0,
      message: 'No open position found for this strategy',
      error: 'NO_OPEN_POSITION',
      processingTimeMs: Date.now() - startTime,
      signalType: 'exit',
    };
  }
  
  // Calculate P&L
  const entryPrice = openPosition.entryPrice / 100;
  const exitPrice = payload.price;
  const direction = openPosition.direction;
  const quantity = openPosition.quantity;
  
  let pnlDollars: number;
  if (payload.pnl !== undefined) {
    pnlDollars = payload.pnl;
  } else {
    pnlDollars = calculatePnL(direction, entryPrice, exitPrice, quantity);
  }
  
  const pnlCents = Math.round(pnlDollars * 100);
  const entryPriceCents = openPosition.entryPrice;
  const exitPriceCents = Math.round(exitPrice * 100);
  const pnlPercent = Math.round((pnlDollars / entryPrice) * 10000);
  
  // Use transaction for atomic operations
  return await withTransaction(async (connection) => {
    const isTestWebhook = payload.isTest;
    
    // Insert webhook log
    const [logResult] = await connection.execute(
      `INSERT INTO webhook_logs (payload, status, strategyId, strategySymbol, direction, entryPrice, exitPrice, pnl, entryTime, exitTime, ipAddress, isTest, createdAt)
       VALUES (?, 'processing', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        JSON.stringify({ ...payload, correlationId, walId }),
        strategy.id,
        payload.strategySymbol,
        direction,
        entryPriceCents,
        exitPriceCents,
        pnlCents,
        openPosition.entryTime,
        payload.timestamp,
        ipAddress || null,
        isTestWebhook,
      ]
    );
    const logId = (logResult as mysql.ResultSetHeader).insertId;
    
    let tradeId: number | null = null;
    
    // Insert trade record (skip for test webhooks)
    if (!isTestWebhook) {
      const [tradeResult] = await connection.execute(
        `INSERT INTO trades (strategyId, entryDate, exitDate, direction, entryPrice, exitPrice, quantity, pnl, pnlPercent, commission, isTest, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, NOW())`,
        [
          strategy.id,
          openPosition.entryTime,
          payload.timestamp,
          direction,
          entryPriceCents,
          exitPriceCents,
          quantity,
          pnlCents,
          pnlPercent,
          isTestWebhook,
        ]
      );
      tradeId = (tradeResult as mysql.ResultSetHeader).insertId;
    }
    
    // Close open position
    await connection.execute(
      `UPDATE open_positions SET status = 'closed', exitPrice = ?, exitTime = ?, exitWebhookLogId = ?, pnl = ?, tradeId = ?, updatedAt = NOW()
       WHERE id = ?`,
      [exitPriceCents, payload.timestamp, logId, pnlCents, tradeId, openPosition.id]
    );
    
    // Update webhook log with success
    await connection.execute(
      `UPDATE webhook_logs SET status = 'success', tradeId = ?, processingTimeMs = ? WHERE id = ?`,
      [tradeId, Date.now() - startTime, logId]
    );
    
    // Invalidate portfolio caches
    cache.invalidatePortfolio();
    
    // Send notification (async, non-blocking)
    const pnlEmoji = pnlDollars >= 0 ? '✅' : '❌';
    const pnlSign = pnlDollars >= 0 ? '+' : '';
    
    notifyOwnerAsync({
      title: `${pnlEmoji} Trade Closed: ${payload.strategySymbol} ${pnlSign}$${pnlDollars.toFixed(2)}`,
      content: `Position closed with ${pnlDollars >= 0 ? 'profit' : 'loss'}\n\n` +
        `**Strategy:** ${payload.strategySymbol}\n` +
        `**Direction:** ${direction}\n` +
        `**Entry Price:** $${entryPrice.toFixed(2)}\n` +
        `**Exit Price:** $${exitPrice.toFixed(2)}\n` +
        `**P&L:** ${pnlSign}$${pnlDollars.toFixed(2)}\n` +
        `**Quantity:** ${quantity} contract${quantity !== 1 ? 's' : ''}`
    });
    
    return {
      success: true,
      logId,
      tradeId: tradeId || undefined,
      positionId: openPosition.id,
      message: `Trade closed: ${payload.strategySymbol} ${direction} ${pnlDollars >= 0 ? '+' : ''}$${pnlDollars.toFixed(2)}`,
      processingTimeMs: Date.now() - startTime,
      signalType: 'exit',
    };
  });
}

/**
 * Replay a failed webhook from WAL
 */
export async function replayWebhook(walId: string): Promise<WebhookResult> {
  const entry = await getWalEntry(walId);
  
  if (!entry) {
    return {
      success: false,
      logId: 0,
      message: `WAL entry not found: ${walId}`,
      error: 'WAL_NOT_FOUND',
    };
  }
  
  if (entry.status === 'completed') {
    return {
      success: false,
      logId: 0,
      message: `WAL entry already completed: ${walId}`,
      error: 'ALREADY_COMPLETED',
    };
  }
  
  const payload = JSON.parse(entry.rawPayload);
  return await processWebhookRobust(payload, entry.sourceIp || undefined, entry.userAgent || undefined);
}

export { generateCorrelationId, checkDatabaseHealth, withTransaction, withRetry };
