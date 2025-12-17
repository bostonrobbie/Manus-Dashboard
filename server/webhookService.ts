/**
 * TradingView Webhook Processing Service
 * 
 * Handles incoming webhook notifications from TradingView alerts,
 * validates the payload, processes trades, and updates the database.
 * 
 * TradingView Webhook Format (as provided by user):
 * {
 *   "symbol": "BTCUSD",
 *   "date": "{{timenow}}",
 *   "data": "{{strategy.order.action}}",
 *   "quantity": 1,
 *   "price": "{{close}}",
 *   "token": "your_secret_token",
 *   "multiple_accounts": [
 *     {"account": "account1", "quantity": 1},
 *     {"account": "account2", "quantity": 2}
 *   ]
 * }
 */

import { 
  getStrategyBySymbol, 
  insertWebhookLog, 
  updateWebhookLog, 
  insertTrade,
  checkDuplicateTrade,
  getLastInsertedTradeId,
  getWebhookLogs,
  deleteWebhookLog,
  deleteAllWebhookLogs,
  getWebhookSettings,
  updateWebhookSettings
} from './db';
import { InsertWebhookLog } from '../drizzle/schema';

// TradingView payload format (actual format from user)
export interface TradingViewPayload {
  symbol: string;              // Strategy/instrument symbol (e.g., "BTCUSD", "ES", "NQ")
  date: string;                // Timestamp from {{timenow}}
  data: string;                // Action from {{strategy.order.action}} - "buy", "sell", "exit", etc.
  quantity: number;            // Number of contracts
  price: string | number;      // Price from {{close}} or {{strategy.order.price}}
  token?: string;              // Secret token for authentication
  multiple_accounts?: Array<{  // Optional multi-account support
    account: string;
    quantity: number;
  }>;
  // Additional fields that may be sent
  direction?: string;          // "Long" or "Short" (optional, can be inferred from data)
  entryPrice?: number;         // Entry price for closed trades
  entryTime?: string;          // Entry timestamp for closed trades
  pnl?: number;                // P&L if provided by TradingView
  strategy?: string;           // Strategy name (alternative to symbol)
  comment?: string;            // Additional trade comment
  quantityMultiplier?: number; // Multiplier for quantity (e.g., 2 = double the signal quantity)
}

// Internal normalized payload after parsing
export interface NormalizedPayload {
  strategySymbol: string;
  action: 'entry' | 'exit' | 'buy' | 'sell';
  direction: 'Long' | 'Short';
  price: number;
  quantity: number;
  timestamp: Date;
  entryPrice?: number;
  entryTime?: Date;
  pnl?: number;
  token?: string;
}

export interface WebhookResult {
  success: boolean;
  logId: number;
  tradeId?: number;
  message: string;
  error?: string;
  processingTimeMs?: number;
}

// Validation errors
export class WebhookValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WebhookValidationError';
  }
}

// Strategy symbol mapping (TradingView symbols to database symbols)
const SYMBOL_MAPPING: Record<string, string> = {
  // ES (E-mini S&P 500)
  'ES': 'ESTrend',
  'ES1!': 'ESTrend',
  'ESH2024': 'ESTrend',
  'ES_TREND': 'ESTrend',
  'ES_ORB': 'ESORB',
  // NQ (E-mini Nasdaq)
  'NQ': 'NQTrend',
  'NQ1!': 'NQTrend',
  'NQ_TREND': 'NQTrend',
  'NQ_ORB': 'NQORB',
  // CL (Crude Oil)
  'CL': 'CLTrend',
  'CL1!': 'CLTrend',
  'CL_TREND': 'CLTrend',
  // BTC (Bitcoin)
  'BTC': 'BTCTrend',
  'BTCUSD': 'BTCTrend',
  'BTC1!': 'BTCTrend',
  'BTC_TREND': 'BTCTrend',
  // GC (Gold)
  'GC': 'GCTrend',
  'GC1!': 'GCTrend',
  'GC_TREND': 'GCTrend',
  // YM (E-mini Dow)
  'YM': 'YMORB',
  'YM1!': 'YMORB',
  'YM_ORB': 'YMORB',
};

/**
 * Map TradingView symbol to database strategy symbol
 */
export function mapSymbolToStrategy(symbol: string): string {
  // Try direct mapping first
  const upperSymbol = symbol.toUpperCase().trim();
  if (SYMBOL_MAPPING[upperSymbol]) {
    return SYMBOL_MAPPING[upperSymbol];
  }
  
  // Try partial match (e.g., "ESH2024" -> "ES")
  for (const [key, value] of Object.entries(SYMBOL_MAPPING)) {
    if (upperSymbol.startsWith(key)) {
      return value;
    }
  }
  
  // Return original if no mapping found
  return symbol;
}

/**
 * Validate and normalize the incoming webhook payload
 */
export function validatePayload(payload: unknown): NormalizedPayload {
  if (!payload || typeof payload !== 'object') {
    throw new WebhookValidationError('Invalid payload: expected JSON object');
  }

  const p = payload as Record<string, unknown>;

  // Get strategy symbol (try multiple field names)
  const rawSymbol = p.symbol || p.strategy;
  if (!rawSymbol || typeof rawSymbol !== 'string') {
    throw new WebhookValidationError('Missing or invalid "symbol" or "strategy" field');
  }
  const strategySymbol = mapSymbolToStrategy(rawSymbol);

  // Get action/data (try multiple field names)
  const rawAction = p.data || p.action;
  if (!rawAction || typeof rawAction !== 'string') {
    throw new WebhookValidationError('Missing or invalid "data" or "action" field');
  }
  
  // Normalize action
  const actionLower = rawAction.toString().toLowerCase().trim();
  let action: 'entry' | 'exit' | 'buy' | 'sell';
  let direction: 'Long' | 'Short';
  
  if (actionLower === 'buy' || actionLower === 'long' || actionLower === 'entry_long') {
    action = 'buy';
    direction = 'Long';
  } else if (actionLower === 'sell' || actionLower === 'short' || actionLower === 'entry_short') {
    action = 'sell';
    direction = 'Short';
  } else if (actionLower === 'exit' || actionLower === 'close' || actionLower === 'exit_long' || actionLower === 'exit_short') {
    action = 'exit';
    // For exits, try to get direction from explicit field or infer from action
    if (actionLower === 'exit_long') {
      direction = 'Long';
    } else if (actionLower === 'exit_short') {
      direction = 'Short';
    } else {
      // Try to get from direction field
      const dirField = p.direction || p.comment;
      if (dirField && typeof dirField === 'string') {
        direction = dirField.toLowerCase().includes('long') ? 'Long' : 'Short';
      } else {
        direction = 'Long'; // Default
      }
    }
  } else {
    throw new WebhookValidationError(`Unknown action: ${rawAction}. Expected: buy, sell, exit, long, short`);
  }

  // Override direction if explicitly provided
  // Handle TradingView's market_position values: "long", "short", "flat"
  if (p.direction && typeof p.direction === 'string') {
    const dirLower = p.direction.toLowerCase().trim();
    if (dirLower === 'long' || dirLower === 'Long') direction = 'Long';
    else if (dirLower === 'short' || dirLower === 'Short') direction = 'Short';
    // "flat" means no position - for exit signals this is expected
  }

  // Get price
  let price: number;
  if (p.price !== undefined) {
    price = typeof p.price === 'string' ? parseFloat(p.price) : Number(p.price);
    if (isNaN(price)) {
      throw new WebhookValidationError('Invalid "price" field: must be a number');
    }
  } else {
    throw new WebhookValidationError('Missing "price" field');
  }

  // Get quantity (default to 1) and apply multiplier if provided
  let quantity = typeof p.quantity === 'number' ? p.quantity : 1;
  
  // Apply quantity multiplier if provided (e.g., user wants 2x the signal quantity)
  if (p.quantityMultiplier && typeof p.quantityMultiplier === 'number' && p.quantityMultiplier > 0) {
    quantity = Math.round(quantity * p.quantityMultiplier);
  }

  // Get timestamp
  let timestamp: Date;
  if (p.date && typeof p.date === 'string') {
    timestamp = parseTimestamp(p.date);
  } else if (p.timestamp && typeof p.timestamp === 'string') {
    timestamp = parseTimestamp(p.timestamp);
  } else {
    timestamp = new Date(); // Use current time if not provided
  }

  // Get entry data for exit trades
  let entryPrice: number | undefined;
  let entryTime: Date | undefined;
  
  if (p.entryPrice !== undefined) {
    entryPrice = typeof p.entryPrice === 'string' ? parseFloat(p.entryPrice) : Number(p.entryPrice);
  }
  
  if (p.entryTime && typeof p.entryTime === 'string') {
    entryTime = parseTimestamp(p.entryTime);
  }

  // Get P&L if provided
  let pnl: number | undefined;
  if (p.pnl !== undefined) {
    pnl = typeof p.pnl === 'string' ? parseFloat(p.pnl) : Number(p.pnl);
  }

  return {
    strategySymbol,
    action,
    direction,
    price,
    quantity,
    timestamp,
    entryPrice,
    entryTime,
    pnl,
    token: typeof p.token === 'string' ? p.token : undefined,
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

  // Try TradingView timenow format: "2024.01.15 14:30:00"
  const dotFormat = timestamp.replace(/\./g, '-').replace(' ', 'T') + 'Z';
  date = new Date(dotFormat);
  if (!isNaN(date.getTime())) {
    return date;
  }

  // Try Unix timestamp (seconds)
  const unixSeconds = parseInt(timestamp, 10);
  if (!isNaN(unixSeconds) && unixSeconds > 1000000000) {
    return new Date(unixSeconds * 1000);
  }

  // Try Unix timestamp (milliseconds)
  if (!isNaN(unixSeconds) && unixSeconds > 1000000000000) {
    return new Date(unixSeconds);
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

// In-memory state for pending entries (waiting for exit)
const pendingEntries = new Map<string, {
  direction: 'Long' | 'Short';
  entryPrice: number;
  entryTime: Date;
  quantity: number;
}>();

/**
 * Get key for pending entry lookup
 */
function getPendingKey(strategySymbol: string): string {
  return strategySymbol.toUpperCase();
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
    // Check if webhook processing is paused
    const settings = await getWebhookSettings();
    if (settings?.paused) {
      return {
        success: false,
        logId: 0,
        message: 'Webhook processing is paused',
        error: 'PAUSED',
        processingTimeMs: Date.now() - startTime,
      };
    }

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
    await updateWebhookLog(logId, { strategySymbol: payload.strategySymbol });

    // Step 3: Validate token if configured
    const expectedToken = process.env.TRADINGVIEW_WEBHOOK_TOKEN;
    if (expectedToken && payload.token !== expectedToken) {
      throw new WebhookValidationError('Invalid or missing authentication token');
    }

    // Step 4: Find strategy in database
    const strategy = await getStrategyBySymbol(payload.strategySymbol);
    if (!strategy) {
      throw new WebhookValidationError(`Unknown strategy: ${payload.strategySymbol}`);
    }

    await updateWebhookLog(logId, { strategyId: strategy.id });

    // Step 5: Handle entry vs exit signals
    const pendingKey = getPendingKey(payload.strategySymbol);

    if (payload.action === 'buy' || payload.action === 'sell') {
      // This is an entry signal - store it for later matching with exit
      pendingEntries.set(pendingKey, {
        direction: payload.direction,
        entryPrice: payload.price,
        entryTime: payload.timestamp,
        quantity: payload.quantity,
      });

      await updateWebhookLog(logId, {
        status: 'success',
        direction: payload.direction,
        entryPrice: Math.round(payload.price * 100),
        entryTime: payload.timestamp,
        processingTimeMs: Date.now() - startTime,
      });

      return {
        success: true,
        logId,
        message: `Entry signal logged for ${payload.strategySymbol}: ${payload.direction} @ $${payload.price}`,
        processingTimeMs: Date.now() - startTime,
      };
    }

    // This is an exit signal - create the trade
    let entryPrice = payload.entryPrice;
    let entryTime = payload.entryTime;
    let direction = payload.direction;

    // Try to get entry data from pending entries
    const pendingEntry = pendingEntries.get(pendingKey);
    if (pendingEntry) {
      entryPrice = entryPrice || pendingEntry.entryPrice;
      entryTime = entryTime || pendingEntry.entryTime;
      direction = pendingEntry.direction;
      pendingEntries.delete(pendingKey); // Clear the pending entry
    }

    // If no entry data available, we can't create a trade
    if (!entryPrice || !entryTime) {
      await updateWebhookLog(logId, {
        status: 'failed',
        direction: payload.direction,
        exitPrice: Math.round(payload.price * 100),
        exitTime: payload.timestamp,
        processingTimeMs: Date.now() - startTime,
        errorMessage: 'Exit signal received but no matching entry found',
      });

      return {
        success: false,
        logId,
        message: 'Exit signal received but no matching entry found',
        error: 'NO_ENTRY',
        processingTimeMs: Date.now() - startTime,
      };
    }

    // Step 6: Check for duplicate trades
    const isDuplicate = await checkDuplicateTrade({
      strategyId: strategy.id,
      entryDate: entryTime,
      exitDate: payload.timestamp,
      direction,
    });

    if (isDuplicate) {
      await updateWebhookLog(logId, {
        status: 'duplicate',
        direction,
        entryPrice: Math.round(entryPrice * 100),
        exitPrice: Math.round(payload.price * 100),
        entryTime,
        exitTime: payload.timestamp,
        processingTimeMs: Date.now() - startTime,
        errorMessage: 'Duplicate trade detected',
      });

      return {
        success: false,
        logId,
        message: 'Duplicate trade detected - skipped',
        error: 'DUPLICATE',
        processingTimeMs: Date.now() - startTime,
      };
    }

    // Step 7: Calculate P&L
    const pnlDollars = payload.pnl !== undefined 
      ? payload.pnl 
      : calculatePnL(direction, entryPrice, payload.price, payload.quantity);

    // Convert to cents for database storage
    const pnlCents = Math.round(pnlDollars * 100);
    const entryPriceCents = Math.round(entryPrice * 100);
    const exitPriceCents = Math.round(payload.price * 100);

    // Calculate P&L percentage (based on entry price)
    const pnlPercent = Math.round((pnlDollars / entryPrice) * 10000);

    // Step 8: Insert trade
    await insertTrade({
      strategyId: strategy.id,
      entryDate: entryTime,
      exitDate: payload.timestamp,
      direction,
      entryPrice: entryPriceCents,
      exitPrice: exitPriceCents,
      quantity: payload.quantity,
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
      direction,
      entryPrice: entryPriceCents,
      exitPrice: exitPriceCents,
      pnl: pnlCents,
      entryTime,
      exitTime: payload.timestamp,
      processingTimeMs: Date.now() - startTime,
    });

    const processingTimeMs = Date.now() - startTime;
    return {
      success: true,
      logId,
      tradeId: tradeId || undefined,
      message: `Trade created for ${payload.strategySymbol}: ${direction} ${pnlDollars >= 0 ? '+' : ''}$${pnlDollars.toFixed(2)}`,
      processingTimeMs,
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
      processingTimeMs,
    };
  }
}

/**
 * Generate the webhook URL for TradingView
 */
export function getWebhookUrl(baseUrl: string): string {
  return `${baseUrl}/api/webhook/tradingview`;
}

/**
 * Generate the TradingView alert message template for a strategy
 */
export function getAlertMessageTemplate(strategySymbol: string, token?: string): string {
  const template: Record<string, unknown> = {
    symbol: strategySymbol,
    date: "{{timenow}}",
    data: "{{strategy.order.action}}",
    quantity: 1,
    price: "{{close}}",
  };
  
  if (token) {
    template.token = token;
  }
  
  return JSON.stringify(template, null, 2);
}

/**
 * Get all available strategy templates
 */
export function getAllStrategyTemplates(token?: string): Array<{
  symbol: string;
  name: string;
  template: string;
}> {
  const strategies = [
    { symbol: 'ESTrend', name: 'ES Trend Following' },
    { symbol: 'ESORB', name: 'ES Opening Range Breakout' },
    { symbol: 'NQTrend', name: 'NQ Trend Following' },
    { symbol: 'NQORB', name: 'NQ Opening Range Breakout' },
    { symbol: 'CLTrend', name: 'CL Trend Following' },
    { symbol: 'BTCTrend', name: 'BTC Trend Following' },
    { symbol: 'GCTrend', name: 'GC Trend Following' },
    { symbol: 'YMORB', name: 'YM Opening Range Breakout' },
  ];
  
  return strategies.map(s => ({
    ...s,
    template: getAlertMessageTemplate(s.symbol, token),
  }));
}

/**
 * Admin functions for webhook management
 */
export async function clearWebhookLogs(): Promise<{ deleted: number }> {
  const deleted = await deleteAllWebhookLogs();
  return { deleted };
}

export async function removeWebhookLog(logId: number): Promise<boolean> {
  return await deleteWebhookLog(logId);
}

export async function pauseWebhookProcessing(): Promise<void> {
  await updateWebhookSettings({ paused: true });
}

export async function resumeWebhookProcessing(): Promise<void> {
  await updateWebhookSettings({ paused: false });
}

export async function isWebhookProcessingPaused(): Promise<boolean> {
  const settings = await getWebhookSettings();
  return settings?.paused ?? false;
}
