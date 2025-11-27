/**
 * CORRECTED VERSION: Build aggregated equity curve by summing PnL across strategies
 * 
 * This represents a single $50k capital pool trading multiple strategies simultaneously.
 * Each strategy's PnL is added to the shared capital.
*/

// Deprecated: use server/src/engine/portfolio-engine instead. Kept for reference only.
import { getDb } from './db';
import { trades, strategies } from '../drizzle/schema';
import { eq, and, gte, lte } from 'drizzle-orm';

interface Trade {
  id: number;
  userId: number;
  strategyId: number | null;
  symbol: string;
  side: 'long' | 'short' | 'buy' | 'sell';
  entryTime: Date;
  exitTime: Date | null;
  entryPrice: string;
  exitPrice: string | null;
  quantity: string;
  pnl: string | null;
  fees?: string | null;
}

interface EquityPoint {
  date: Date;
  equity: number;
  dailyPnL: number;
  dailyReturn: number;
}

/**
 * Compute PnL for a single trade
 */
function computeTradePnl(trade: Trade): number {
  if (!trade.exitPrice || !trade.exitTime) return 0;

  const entryPrice = parseFloat(trade.entryPrice);
  const exitPrice = parseFloat(trade.exitPrice);
  const quantity = parseFloat(trade.quantity);
  const fees = parseFloat(trade.fees || '0');

  let grossPnl = 0;
  if (trade.side === 'long') {
    grossPnl = (exitPrice - entryPrice) * quantity;
  } else {
    grossPnl = (entryPrice - exitPrice) * quantity;
  }

  return grossPnl - fees;
}

/**
 * Format date as YYYY-MM-DD
 */
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Build aggregated equity curve by summing PnL across multiple strategies
 * 
 * CRITICAL: This aggregates PnL, not equity! All strategies trade the same capital pool.
 */
export async function buildAggregatedEquityCurve(
  userId: number,
  options: {
    strategyIds?: number[];
    strategyType?: 'swing' | 'intraday' | 'all';
    initialCapital?: number;
    startDate?: Date;
    endDate?: Date;
  } = {}
): Promise<EquityPoint[]> {
  const db = await getDb();
  if (!db) return [];

  const { strategyIds, strategyType, initialCapital = 50000, startDate, endDate } = options;

  // Determine which strategies to include
  let targetStrategyIds: number[] = [];

  if (strategyIds && strategyIds.length > 0) {
    targetStrategyIds = strategyIds;
  } else {
    // Query strategies by type
    const conditions = [eq(strategies.userId, userId)];
    
    if (strategyType && strategyType !== 'all') {
      conditions.push(eq(strategies.type, strategyType));
    }

    const stratList = await db.select({ id: strategies.id })
      .from(strategies)
      .where(and(...conditions));
    
    targetStrategyIds = stratList.map(s => s.id);
  }

  if (targetStrategyIds.length === 0) {
    return [{
      date: new Date(),
      equity: initialCapital,
      dailyPnL: 0,
      dailyReturn: 0,
    }];
  }

  // Load ALL trades for these strategies
  const conditions = [
    eq(trades.userId, userId),
  ];

  // Add strategy filter
  if (targetStrategyIds.length === 1) {
    conditions.push(eq(trades.strategyId, targetStrategyIds[0]));
  } else {
    // For multiple strategies, we need to use OR logic
    // Drizzle doesn't have a clean way to do this, so we'll filter in memory
  }

  if (startDate) {
    conditions.push(gte(trades.exitTime, startDate));
  }
  if (endDate) {
    conditions.push(lte(trades.exitTime, endDate));
  }

  const allTrades = await db.select()
    .from(trades)
    .where(and(...conditions))
    .orderBy(trades.exitTime);

  // Filter to only closed trades from target strategies
  const closedTrades = allTrades.filter(t => 
    t.exitTime && 
    t.exitPrice && 
    t.strategyId !== null &&
    targetStrategyIds.includes(t.strategyId)
  );

  if (closedTrades.length === 0) {
    return [{
      date: new Date(),
      equity: initialCapital,
      dailyPnL: 0,
      dailyReturn: 0,
    }];
  }

  // Accumulate PnL by date (sum PnL from all strategies per day)
  const pnlByDate = new Map<string, number>();

  for (const trade of closedTrades) {
    const tradePnl = computeTradePnl(trade);
    const dateKey = formatDate(trade.exitTime!);
    
    pnlByDate.set(dateKey, (pnlByDate.get(dateKey) || 0) + tradePnl);
  }

  // Get first and last dates
  const sortedDates = Array.from(pnlByDate.keys()).sort();
  const firstDate = new Date(sortedDates[0]);
  const lastDate = new Date(sortedDates[sortedDates.length - 1]);

  // Build cumulative equity series
  const points: EquityPoint[] = [];
  let equity = initialCapital;
  let currentDate = new Date(firstDate);

  while (currentDate <= lastDate) {
    const dateKey = formatDate(currentDate);
    const dayPnl = pnlByDate.get(dateKey) || 0;
    
    const previousEquity = equity;
    equity += dayPnl; // CUMULATIVE: add today's PnL to running total

    const dailyReturn = previousEquity > 0 ? ((equity / previousEquity) - 1) * 100 : 0;

    points.push({
      date: new Date(currentDate),
      equity,
      dailyPnL: dayPnl,
      dailyReturn,
    });

    // Move to next day
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return points;
}
