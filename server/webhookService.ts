/**
 * TradingView Webhook Processing Service
 * 
 * Handles incoming webhook notifications from TradingView alerts,
 * validates the payload, processes trades, and updates the database.
 */

import { 
  getStrategyBySymbol, 
  insertWebhookLog, 
  updateWebhookLog, 
  insertTrade,
  checkDuplicateTrade,
  getLastInsertedTradeId
} from './db';
import { InsertWebhookLog } from '../drizzle/schema';

// Expected payload format from TradingView
export interface TradingViewPayload {
  strategy: string;        // Strategy symbol (e.g., "ESTrend", "NQORB")
  action: string;          // "entry" or "exit" or "trade_closed"
  direction: string;       // "Long" or "Short"
  entryPrice: number;      // Entry price
  exitPrice?: number;      // Exit price (for closed trades)
  entryTime: string;       // ISO timestamp or TradingView format
  exitTime?: string;       // ISO timestamp (for closed trades)
  quantity?: number;       // Number of contracts (default: 1)
  pnl?: number;            // P&L in dollars (optional, can be calculated)
  secret?: string;         // API secret for authentication
}

export interface WebhookResult {
  success: boolean;
  logId: number;
  tradeId?: number;
  message: string;
  error?: string;
}

// Validation errors
export class WebhookValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WebhookValidationError';
  }
}

/**
 * Validate the incoming webhook payload
 */
export function validatePayload(payload: unknown): TradingViewPayload {
  if (!payload || typeof payload !== 'object') {
    throw new WebhookValidationError('Invalid payload: expected JSON object');
  }

  const p = payload as Record<string, unknown>;

  // Required fields
  if (!p.strategy || typeof p.strategy !== 'string') {
    throw new WebhookValidationError('Missing or invalid "strategy" field');
  }

  if (!p.action || typeof p.action !== 'string') {
    throw new WebhookValidationError('Missing or invalid "action" field');
  }

  if (!p.direction || typeof p.direction !== 'string') {
    throw new WebhookValidationError('Missing or invalid "direction" field');
  }

  // Normalize direction
  const direction = p.direction.toString().toLowerCase();
  if (direction !== 'long' && direction !== 'short') {
    throw new WebhookValidationError('Direction must be "Long" or "Short"');
  }

  if (p.entryPrice === undefined || typeof p.entryPrice !== 'number') {
    throw new WebhookValidationError('Missing or invalid "entryPrice" field');
  }

  if (!p.entryTime || typeof p.entryTime !== 'string') {
    throw new WebhookValidationError('Missing or invalid "entryTime" field');
  }

  // For closed trades, we need exit data
  const action = p.action.toString().toLowerCase();
  if (action === 'exit' || action === 'trade_closed' || action === 'close') {
    if (p.exitPrice === undefined || typeof p.exitPrice !== 'number') {
      throw new WebhookValidationError('Missing or invalid "exitPrice" field for closed trade');
    }
    if (!p.exitTime || typeof p.exitTime !== 'string') {
      throw new WebhookValidationError('Missing or invalid "exitTime" field for closed trade');
    }
  }

  return {
    strategy: p.strategy as string,
    action: action,
    direction: direction === 'long' ? 'Long' : 'Short',
    entryPrice: p.entryPrice as number,
    exitPrice: p.exitPrice as number | undefined,
    entryTime: p.entryTime as string,
    exitTime: p.exitTime as string | undefined,
    quantity: typeof p.quantity === 'number' ? p.quantity : 1,
    pnl: typeof p.pnl === 'number' ? p.pnl : undefined,
    secret: typeof p.secret === 'string' ? p.secret : undefined,
  };
}

/**
 * Parse timestamp from various formats
 */
export function parseTimestamp(timestamp: string): Date {
  // Try ISO format first
  let date = new Date(timestamp);
  if (!isNaN(date.getTime())) {
    return date;
  }

  // Try TradingView format: "2024-01-15 14:30:00"
  date = new Date(timestamp.replace(' ', 'T') + 'Z');
  if (!isNaN(date.getTime())) {
    return date;
  }

  // Try Unix timestamp (seconds)
  const unixSeconds = parseInt(timestamp, 10);
  if (!isNaN(unixSeconds)) {
    return new Date(unixSeconds * 1000);
  }

  throw new WebhookValidationError(`Invalid timestamp format: ${timestamp}`);
}

/**
 * Calculate P&L based on entry/exit prices and direction
 */
export function calculatePnL(
  direction: string,
  entryPrice: number,
  exitPrice: number,
  quantity: number = 1
): number {
  if (direction === 'Long') {
    return (exitPrice - entryPrice) * quantity;
  } else {
    return (entryPrice - exitPrice) * quantity;
  }
}

/**
 * Process a TradingView webhook notification
 */
export async function processWebhook(
  rawPayload: unknown,
  ipAddress?: string
): Promise<WebhookResult> {
  const startTime = Date.now();
  let logId: number | null = null;

  try {
    // Step 1: Create initial log entry
    const logEntry: InsertWebhookLog = {
      payload: JSON.stringify(rawPayload),
      status: 'pending',
      ipAddress: ipAddress || null,
    };

    const logResult = await insertWebhookLog(logEntry);
    // Get the inserted ID - MySQL returns insertId in the result
    logId = (logResult as any)[0]?.insertId || (logResult as any).insertId;

    if (!logId) {
      throw new Error('Failed to create webhook log entry');
    }

    // Step 2: Validate payload
    await updateWebhookLog(logId, { status: 'processing' });
    const payload = validatePayload(rawPayload);

    // Update log with parsed strategy symbol
    await updateWebhookLog(logId, { strategySymbol: payload.strategy });

    // Step 3: Find strategy in database
    const strategy = await getStrategyBySymbol(payload.strategy);
    if (!strategy) {
      throw new WebhookValidationError(`Unknown strategy: ${payload.strategy}`);
    }

    await updateWebhookLog(logId, { strategyId: strategy.id });

    // Step 4: Only process closed trades (not entries)
    if (payload.action !== 'exit' && payload.action !== 'trade_closed' && payload.action !== 'close') {
      // Log entry signals but don't create trades
      await updateWebhookLog(logId, {
        status: 'success',
        direction: payload.direction,
        entryPrice: Math.round(payload.entryPrice * 100),
        entryTime: parseTimestamp(payload.entryTime),
        processingTimeMs: Date.now() - startTime,
      });

      return {
        success: true,
        logId,
        message: `Entry signal logged for ${payload.strategy}`,
      };
    }

    // Step 5: Parse timestamps
    const entryDate = parseTimestamp(payload.entryTime);
    const exitDate = parseTimestamp(payload.exitTime!);

    // Step 6: Check for duplicate trades
    const isDuplicate = await checkDuplicateTrade({
      strategyId: strategy.id,
      entryDate,
      exitDate,
      direction: payload.direction,
    });

    if (isDuplicate) {
      await updateWebhookLog(logId, {
        status: 'duplicate',
        direction: payload.direction,
        entryPrice: Math.round(payload.entryPrice * 100),
        exitPrice: Math.round(payload.exitPrice! * 100),
        entryTime: entryDate,
        exitTime: exitDate,
        processingTimeMs: Date.now() - startTime,
        errorMessage: 'Duplicate trade detected',
      });

      return {
        success: false,
        logId,
        message: 'Duplicate trade detected - skipped',
        error: 'DUPLICATE',
      };
    }

    // Step 7: Calculate P&L
    const pnlDollars = payload.pnl !== undefined 
      ? payload.pnl 
      : calculatePnL(payload.direction, payload.entryPrice, payload.exitPrice!, payload.quantity);

    // Convert to cents for database storage
    const pnlCents = Math.round(pnlDollars * 100);
    const entryPriceCents = Math.round(payload.entryPrice * 100);
    const exitPriceCents = Math.round(payload.exitPrice! * 100);

    // Calculate P&L percentage (based on entry price)
    const pnlPercent = Math.round((pnlDollars / payload.entryPrice) * 10000);

    // Step 8: Insert trade
    await insertTrade({
      strategyId: strategy.id,
      entryDate,
      exitDate,
      direction: payload.direction,
      entryPrice: entryPriceCents,
      exitPrice: exitPriceCents,
      quantity: payload.quantity || 1,
      pnl: pnlCents,
      pnlPercent,
      commission: 0,
    });

    // Get the trade ID
    const tradeId = await getLastInsertedTradeId(strategy.id);

    // Step 9: Update log with success
    await updateWebhookLog(logId, {
      status: 'success',
      tradeId: tradeId || undefined,
      direction: payload.direction,
      entryPrice: entryPriceCents,
      exitPrice: exitPriceCents,
      pnl: pnlCents,
      entryTime: entryDate,
      exitTime: exitDate,
      processingTimeMs: Date.now() - startTime,
    });

    return {
      success: true,
      logId,
      tradeId: tradeId || undefined,
      message: `Trade created for ${payload.strategy}: ${payload.direction} ${pnlDollars >= 0 ? '+' : ''}$${pnlDollars.toFixed(2)}`,
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const processingTimeMs = Date.now() - startTime;

    // Update log with error
    if (logId) {
      await updateWebhookLog(logId, {
        status: 'failed',
        errorMessage,
        processingTimeMs,
      });
    }

    return {
      success: false,
      logId: logId || 0,
      message: 'Webhook processing failed',
      error: errorMessage,
    };
  }
}

/**
 * Generate the webhook URL for TradingView
 */
export function getWebhookUrl(baseUrl: string, secret?: string): string {
  const url = `${baseUrl}/api/webhook/tradingview`;
  return secret ? `${url}?secret=${secret}` : url;
}

/**
 * Generate the TradingView alert message template
 */
export function getAlertMessageTemplate(strategySymbol: string): string {
  return JSON.stringify({
    strategy: strategySymbol,
    action: "{{strategy.order.action}}",
    direction: "{{strategy.order.comment}}",
    entryPrice: "{{strategy.order.price}}",
    exitPrice: "{{close}}",
    entryTime: "{{timenow}}",
    exitTime: "{{timenow}}",
    quantity: 1,
    pnl: "{{strategy.order.profit}}"
  }, null, 2);
}
