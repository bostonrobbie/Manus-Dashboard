/**
 * TradingView Webhook Processing Service - Enhanced with Persistent Position Tracking
 * 
 * Handles incoming webhook notifications from TradingView alerts,
 * validates the payload, processes trades, and updates the database.
 * 
 * NEW: Uses database-backed open positions for reliable entry/exit tracking
 * that persists across server restarts.
 * 
 * TradingView Webhook Format (Enhanced):
 * {
 *   "symbol": "ESTrend",
 *   "date": "{{timenow}}",
 *   "data": "{{strategy.order.action}}",
 *   "position": "{{strategy.market_position}}",  // NEW: "long", "short", or "flat"
 *   "quantity": 1,
 *   "price": "{{close}}",
 *   "token": "your_secret_token",
 *   "signalType": "entry" | "exit"  // NEW: Explicit signal type (optional)
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
  updateWebhookSettings,
  // New position tracking functions
  createOpenPosition,
  getOpenPositionByStrategy,
  closeOpenPosition,
  getAllOpenPositions,
  getRecentPositions,
  getPositionStats,
  // Notification preferences
  shouldSendNotification,
} from './db';
import { InsertWebhookLog, InsertOpenPosition } from '../drizzle/schema';
import { notifyOwnerAsync } from './_core/notification';

// TradingView payload format (enhanced with position tracking)
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
  // NEW: Enhanced position tracking fields
  position?: string;           // From {{strategy.market_position}} - "long", "short", "flat"
  signalType?: string;         // Explicit signal type: "entry", "exit", "scale_in", "scale_out"
  prevPosition?: string;       // Previous position state (for detecting transitions)
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
  // NEW: Enhanced fields
  signalType: 'entry' | 'exit';  // Determined signal type
  marketPosition: 'long' | 'short' | 'flat';  // Current market position
}

export interface WebhookResult {
  success: boolean;
  logId: number;
  tradeId?: number;
  positionId?: number;  // NEW: Link to open position
  message: string;
  error?: string;
  processingTimeMs?: number;
  signalType?: 'entry' | 'exit';  // NEW: What type of signal was processed
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
  'ESTREND': 'ESTrend',
  // NQ (E-mini Nasdaq)
  'NQ': 'NQTrend',
  'NQ1!': 'NQTrend',
  'NQ_TREND': 'NQTrend',
  'NQ_ORB': 'NQORB',
  'NQTREND': 'NQTrend',
  // CL (Crude Oil)
  'CL': 'CLTrend',
  'CL1!': 'CLTrend',
  'CL_TREND': 'CLTrend',
  'CLTREND': 'CLTrend',
  // BTC (Bitcoin)
  'BTC': 'BTCTrend',
  'BTCUSD': 'BTCTrend',
  'BTC1!': 'BTCTrend',
  'BTC_TREND': 'BTCTrend',
  'BTCTREND': 'BTCTrend',
  // GC (Gold)
  'GC': 'GCTrend',
  'GC1!': 'GCTrend',
  'GC_TREND': 'GCTrend',
  'GCTREND': 'GCTrend',
  // YM (E-mini Dow)
  'YM': 'YMORB',
  'YM1!': 'YMORB',
  'YM_ORB': 'YMORB',
  'YMORB': 'YMORB',
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
 * Determine signal type from payload
 * Priority: explicit signalType > position change > action inference
 */
function determineSignalType(payload: Record<string, unknown>): 'entry' | 'exit' {
  // 1. Check explicit signalType field
  if (payload.signalType && typeof payload.signalType === 'string') {
    const st = payload.signalType.toLowerCase().trim();
    if (st === 'entry' || st === 'open' || st === 'enter') return 'entry';
    if (st === 'exit' || st === 'close' || st === 'flat') return 'exit';
  }
  
  // 2. Check market position (from {{strategy.market_position}})
  if (payload.position && typeof payload.position === 'string') {
    const pos = payload.position.toLowerCase().trim();
    // "flat" means no position = exit signal
    if (pos === 'flat') return 'exit';
    // "long" or "short" with no previous position = entry
    // This is a new position being opened
  }
  
  // 3. Infer from action/data field
  const action = (payload.data || payload.action) as string;
  if (action && typeof action === 'string') {
    const actionLower = action.toLowerCase().trim();
    // Exit-related actions
    if (actionLower.includes('exit') || actionLower.includes('close') || actionLower === 'flat') {
      return 'exit';
    }
    // Entry-related actions (buy/sell are entries)
    if (actionLower === 'buy' || actionLower === 'sell' || 
        actionLower === 'long' || actionLower === 'short' ||
        actionLower.includes('entry')) {
      return 'entry';
    }
  }
  
  // Default to entry if we can't determine
  return 'entry';
}

/**
 * Determine market position from payload
 */
function determineMarketPosition(payload: Record<string, unknown>): 'long' | 'short' | 'flat' {
  // Check explicit position field first
  if (payload.position && typeof payload.position === 'string') {
    const pos = payload.position.toLowerCase().trim();
    if (pos === 'long') return 'long';
    if (pos === 'short') return 'short';
    if (pos === 'flat' || pos === 'none' || pos === '') return 'flat';
  }
  
  // Infer from direction
  if (payload.direction && typeof payload.direction === 'string') {
    const dir = payload.direction.toLowerCase().trim();
    if (dir === 'long') return 'long';
    if (dir === 'short') return 'short';
  }
  
  // Infer from action
  const action = (payload.data || payload.action) as string;
  if (action && typeof action === 'string') {
    const actionLower = action.toLowerCase().trim();
    if (actionLower === 'buy' || actionLower === 'long' || actionLower.includes('entry_long')) {
      return 'long';
    }
    if (actionLower === 'sell' || actionLower === 'short' || actionLower.includes('entry_short')) {
      return 'short';
    }
    if (actionLower.includes('exit') || actionLower === 'flat' || actionLower === 'close') {
      return 'flat';
    }
  }
  
  return 'flat';
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
  
  // Determine signal type and market position
  const signalType = determineSignalType(p);
  const marketPosition = determineMarketPosition(p);
  
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
  } else if (actionLower === 'exit' || actionLower === 'close' || actionLower === 'exit_long' || actionLower === 'exit_short' || actionLower === 'flat') {
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
    signalType,
    marketPosition,
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
 * Format duration between two dates in human-readable format
 */
function formatDuration(start: Date, end: Date): string {
  const diffMs = end.getTime() - start.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffDays > 0) {
    const hours = diffHours % 24;
    return `${diffDays}d ${hours}h`;
  } else if (diffHours > 0) {
    const mins = diffMins % 60;
    return `${diffHours}h ${mins}m`;
  } else {
    return `${diffMins}m`;
  }
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
 * Enhanced with persistent position tracking
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

    // Step 5: Determine if this is an entry or exit signal
    const isEntrySignal = payload.signalType === 'entry' || 
                          (payload.action === 'buy' || payload.action === 'sell') && 
                          payload.marketPosition !== 'flat';
    
    const isExitSignal = payload.signalType === 'exit' || 
                         payload.action === 'exit' || 
                         payload.marketPosition === 'flat';

    // Step 6: Handle based on signal type
    if (isEntrySignal && !isExitSignal) {
      // ENTRY SIGNAL: Create a new open position
      return await handleEntrySignal(logId, payload, strategy, startTime);
    } else if (isExitSignal) {
      // EXIT SIGNAL: Close the open position and create trade
      return await handleExitSignal(logId, payload, strategy, startTime);
    } else {
      // Ambiguous signal - try to determine from existing positions
      const existingPosition = await getOpenPositionByStrategy(payload.strategySymbol);
      
      if (existingPosition) {
        // We have an open position, treat this as an exit
        return await handleExitSignal(logId, payload, strategy, startTime);
      } else {
        // No open position, treat this as an entry
        return await handleEntrySignal(logId, payload, strategy, startTime);
      }
    }

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
 * Handle an entry signal - create a new open position
 */
async function handleEntrySignal(
  logId: number,
  payload: NormalizedPayload,
  strategy: { id: number; symbol: string },
  startTime: number
): Promise<WebhookResult> {
  const processingTimeMs = Date.now() - startTime;
  
  // Check if there's already an open position for this strategy
  const existingPosition = await getOpenPositionByStrategy(payload.strategySymbol);
  
  if (existingPosition) {
    // Already have an open position - this might be a scale-in or duplicate
    await updateWebhookLog(logId, {
      status: 'duplicate',
      direction: payload.direction,
      entryPrice: Math.round(payload.price * 100),
      entryTime: payload.timestamp,
      processingTimeMs,
      errorMessage: `Position already open for ${payload.strategySymbol} (ID: ${existingPosition.id})`,
    });

    return {
      success: false,
      logId,
      positionId: existingPosition.id,
      message: `Position already open for ${payload.strategySymbol}. Close existing position first or use scale_in signal.`,
      error: 'POSITION_EXISTS',
      processingTimeMs,
      signalType: 'entry',
    };
  }

  // Create new open position
  const newPosition: InsertOpenPosition = {
    strategyId: strategy.id,
    strategySymbol: payload.strategySymbol,
    direction: payload.direction,
    entryPrice: Math.round(payload.price * 100),
    quantity: payload.quantity,
    entryTime: payload.timestamp,
    entryWebhookLogId: logId,
    status: 'open',
  };

  const positionId = await createOpenPosition(newPosition);

  // Update webhook log with success
  await updateWebhookLog(logId, {
    status: 'success',
    direction: payload.direction,
    entryPrice: Math.round(payload.price * 100),
    entryTime: payload.timestamp,
    processingTimeMs,
  });

  // Send async notification for entry signal (non-blocking)
  // Note: For now, we send to owner. In the future, this could be extended
  // to send to subscribed users based on their notification preferences.
  // The shouldSendNotification function is available for per-user checks.
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
    positionId: positionId || undefined,
    message: `Entry signal logged: ${payload.strategySymbol} ${payload.direction} @ $${payload.price.toFixed(2)}`,
    processingTimeMs,
    signalType: 'entry',
  };
}

/**
 * Handle an exit signal - close open position and create trade
 */
async function handleExitSignal(
  logId: number,
  payload: NormalizedPayload,
  strategy: { id: number; symbol: string },
  startTime: number
): Promise<WebhookResult> {
  // Find the open position for this strategy
  const openPosition = await getOpenPositionByStrategy(payload.strategySymbol);

  if (!openPosition) {
    // No open position found - can't process exit
    const processingTimeMs = Date.now() - startTime;
    
    await updateWebhookLog(logId, {
      status: 'failed',
      direction: payload.direction,
      exitPrice: Math.round(payload.price * 100),
      exitTime: payload.timestamp,
      processingTimeMs,
      errorMessage: 'Exit signal received but no matching open position found',
    });

    return {
      success: false,
      logId,
      message: 'Exit signal received but no matching open position found',
      error: 'NO_OPEN_POSITION',
      processingTimeMs: Date.now() - startTime,
      signalType: 'exit',
    };
  }

  // Get entry data from open position
  const entryPrice = openPosition.entryPrice / 100; // Convert from cents
  const entryTime = openPosition.entryTime;
  const direction = openPosition.direction;
  const quantity = openPosition.quantity;

  // Check for duplicate trades
  const isDuplicate = await checkDuplicateTrade({
    strategyId: strategy.id,
    entryDate: entryTime,
    exitDate: payload.timestamp,
    direction,
  });

  if (isDuplicate) {
    const processingTimeMs = Date.now() - startTime;
    
    await updateWebhookLog(logId, {
      status: 'duplicate',
      direction,
      entryPrice: openPosition.entryPrice,
      exitPrice: Math.round(payload.price * 100),
      entryTime,
      exitTime: payload.timestamp,
      processingTimeMs,
      errorMessage: 'Duplicate trade detected',
    });

    return {
      success: false,
      logId,
      positionId: openPosition.id,
      message: 'Duplicate trade detected - skipped',
      error: 'DUPLICATE',
      processingTimeMs,
      signalType: 'exit',
    };
  }

  // Calculate P&L
  const pnlDollars = payload.pnl !== undefined 
    ? payload.pnl 
    : calculatePnL(direction, entryPrice, payload.price, quantity);

  // Convert to cents for database storage
  const pnlCents = Math.round(pnlDollars * 100);
  const entryPriceCents = openPosition.entryPrice;
  const exitPriceCents = Math.round(payload.price * 100);

  // Calculate P&L percentage (based on entry price)
  const pnlPercent = Math.round((pnlDollars / entryPrice) * 10000);

  // Insert trade record
  await insertTrade({
    strategyId: strategy.id,
    entryDate: entryTime,
    exitDate: payload.timestamp,
    direction,
    entryPrice: entryPriceCents,
    exitPrice: exitPriceCents,
    quantity,
    pnl: pnlCents,
    pnlPercent,
    commission: 0,
  });

  // Get the trade ID
  const tradeId = await getLastInsertedTradeId(strategy.id);

  // Close the open position
  await closeOpenPosition(openPosition.id, {
    exitPrice: exitPriceCents,
    exitTime: payload.timestamp,
    exitWebhookLogId: logId,
    pnl: pnlCents,
    tradeId: tradeId || undefined,
  });

  // Update webhook log with success
  const processingTimeMs = Date.now() - startTime;
  
  await updateWebhookLog(logId, {
    status: 'success',
    tradeId: tradeId || undefined,
    direction,
    entryPrice: entryPriceCents,
    exitPrice: exitPriceCents,
    pnl: pnlCents,
    entryTime,
    exitTime: payload.timestamp,
    processingTimeMs,
  });

  // Send async notification for exit signal with P&L (non-blocking)
  const pnlEmoji = pnlDollars >= 0 ? '✅' : '❌';
  const pnlSign = pnlDollars >= 0 ? '+' : '';
  
  notifyOwnerAsync({
    title: `${pnlEmoji} Trade Closed: ${payload.strategySymbol} ${pnlSign}$${pnlDollars.toFixed(2)}`,
    content: `Position closed with ${pnlDollars >= 0 ? 'profit' : 'loss'}\n\n` +
      `**Strategy:** ${payload.strategySymbol}\n` +
      `**Direction:** ${direction}\n` +
      `**Entry Price:** $${entryPrice.toFixed(2)}\n` +
      `**Exit Price:** $${payload.price.toFixed(2)}\n` +
      `**P&L:** ${pnlSign}$${pnlDollars.toFixed(2)}\n` +
      `**Quantity:** ${quantity} contract${quantity !== 1 ? 's' : ''}\n` +
      `**Duration:** ${formatDuration(entryTime, payload.timestamp)}`
  });

  return {
    success: true,
    logId,
    tradeId: tradeId || undefined,
    positionId: openPosition.id,
    message: `Trade closed: ${payload.strategySymbol} ${direction} ${pnlDollars >= 0 ? '+' : ''}$${pnlDollars.toFixed(2)}`,
    processingTimeMs,
    signalType: 'exit',
  };
}

/**
 * Generate the webhook URL for TradingView
 */
export function getWebhookUrl(baseUrl: string): string {
  return `${baseUrl}/api/webhook/tradingview`;
}

/**
 * Generate the TradingView alert message template for a strategy (Enhanced)
 */
export function getAlertMessageTemplate(strategySymbol: string, token?: string): string {
  const template: Record<string, unknown> = {
    symbol: strategySymbol,
    date: "{{timenow}}",
    data: "{{strategy.order.action}}",
    position: "{{strategy.market_position}}",  // NEW: Track position state
    quantity: "{{strategy.order.contracts}}",
    price: "{{close}}",
  };
  
  if (token) {
    template.token = token;
  }
  
  return JSON.stringify(template, null, 2);
}

/**
 * Generate entry-specific alert template
 */
export function getEntryAlertTemplate(strategySymbol: string, token?: string): string {
  const template: Record<string, unknown> = {
    symbol: strategySymbol,
    signalType: "entry",
    date: "{{timenow}}",
    data: "{{strategy.order.action}}",
    direction: "{{strategy.market_position}}",
    quantity: "{{strategy.order.contracts}}",
    price: "{{strategy.order.price}}",
  };
  
  if (token) {
    template.token = token;
  }
  
  return JSON.stringify(template, null, 2);
}

/**
 * Generate exit-specific alert template
 */
export function getExitAlertTemplate(strategySymbol: string, token?: string): string {
  const template: Record<string, unknown> = {
    symbol: strategySymbol,
    signalType: "exit",
    date: "{{timenow}}",
    data: "exit",
    position: "flat",
    quantity: "{{strategy.order.contracts}}",
    price: "{{strategy.order.price}}",
  };
  
  if (token) {
    template.token = token;
  }
  
  return JSON.stringify(template, null, 2);
}

/**
 * Get all available strategy templates (Enhanced with entry/exit templates)
 */
export function getAllStrategyTemplates(token?: string): Array<{
  symbol: string;
  name: string;
  template: string;
  entryTemplate: string;
  exitTemplate: string;
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
    entryTemplate: getEntryAlertTemplate(s.symbol, token),
    exitTemplate: getExitAlertTemplate(s.symbol, token),
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

/**
 * Get open positions for dashboard display
 */
export async function getOpenPositionsForDashboard() {
  return await getAllOpenPositions();
}

/**
 * Get recent positions (open + closed) for activity feed
 */
export async function getRecentPositionsForDashboard(limit: number = 50) {
  return await getRecentPositions(limit);
}

/**
 * Get position statistics for dashboard
 */
export async function getPositionStatsForDashboard() {
  return await getPositionStats();
}
