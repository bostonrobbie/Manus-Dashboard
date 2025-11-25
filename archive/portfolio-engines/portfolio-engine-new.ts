/**
 * CANONICAL PORTFOLIO ENGINE - COMPLETE REWRITE
 * 
 * Single source of truth for all equity/drawdown/comparison calculations.
 * Implements the full ChatGPT specification for proper data alignment.
 */

import { getDb } from './db';
import { trades, strategies, benchmarks } from '../drizzle/schema';
import { eq, and, gte, lte, isNotNull, inArray, sql } from 'drizzle-orm';

// ============================================================================
// TYPES
// ============================================================================

export type StrategyType = 'swing' | 'intraday';

export interface StrategyDailyRow {
  date: string;             // ISO YYYY-MM-DD
  strategyId: number;
  strategyName: string;
  strategyType: StrategyType;
  dailyPnl: number;         // DAILY PnL (not cumulative)
}

export interface BenchmarkDailyRow {
  date: string;             // ISO YYYY-MM-DD
  close: number;            // SPX close price
}

export interface MultiCurvePoint {
  date: string;
  combined: number;
  swing: number;
  intraday: number;
  spx: number;
}

export interface MultiCurveResult {
  points: MultiCurvePoint[];
}

export interface EquityCurveOptions {
  startDate?: string;    // "YYYY-MM-DD"
  endDate?: string;      // "YYYY-MM-DD"
  maxPoints?: number;    // e.g. 2000
}

export interface DrawdownPoint {
  date: string;
  combined: number;
  swing: number;
  intraday: number;
  spx: number;
}

export interface DrawdownResult {
  points: DrawdownPoint[];
}

// ============================================================================
// CANONICAL EQUITY CURVE BUILDER
// ============================================================================

/**
 * Build normalized, aligned equity curves for:
 * - Combined Portfolio (all strategies)
 * - Swing strategies only
 * - Intraday strategies only
 * - S&P 500 benchmark
 *
 * Invariants:
 * - All curves share the same date index (sorted ascending).
 * - Missing dates are forward-filled (sticky equity).
 * - All curves are normalized so the first point is 0.
 */
export async function buildAggregatedEquityCurve(
  userId: number,
  opts: EquityCurveOptions = {}
): Promise<MultiCurveResult> {
  const { startDate, endDate, maxPoints = 2000 } = opts;

  // 1. Load raw daily data from DB
  const strategyRows = await loadStrategyDailyRowsFromDb(userId, startDate, endDate);
  const benchmarkRows = await loadBenchmarkDailyRowsFromDb(startDate, endDate);

  if (!strategyRows.length || !benchmarkRows.length) {
    return { points: [] };
  }

  // 2. Build DAILY PnL maps per date per type
  const dailyCombined: Record<string, number> = {};
  const dailySwing: Record<string, number> = {};
  const dailyIntraday: Record<string, number> = {};

  for (const row of strategyRows) {
    const d = row.date;
    const pnl = row.dailyPnl ?? 0;

    dailyCombined[d] = (dailyCombined[d] ?? 0) + pnl;

    if (row.strategyType === 'swing') {
      dailySwing[d] = (dailySwing[d] ?? 0) + pnl;
    } else if (row.strategyType === 'intraday') {
      dailyIntraday[d] = (dailyIntraday[d] ?? 0) + pnl;
    }
  }

  // 3. Convert DAILY PnL → cumulative equity curves
  const allDatesSet = new Set<string>();

  Object.keys(dailyCombined).forEach((d) => allDatesSet.add(d));
  benchmarkRows.forEach((b) => allDatesSet.add(b.date));

  const allDates = Array.from(allDatesSet).sort();

  const combinedEquityMap: Record<string, number> = {};
  const swingEquityMap: Record<string, number> = {};
  const intradayEquityMap: Record<string, number> = {};

  let runningCombined = 0;
  let runningSwing = 0;
  let runningIntraday = 0;

  for (const d of allDates) {
    runningCombined += dailyCombined[d] ?? 0;
    runningSwing += dailySwing[d] ?? 0;
    runningIntraday += dailyIntraday[d] ?? 0;

    combinedEquityMap[d] = runningCombined;
    swingEquityMap[d] = runningSwing;
    intradayEquityMap[d] = runningIntraday;
  }

  // 4. Build SPX "equity" series from prices (normalized later)
  const spxPriceMap: Record<string, number> = {};
  for (const row of benchmarkRows) {
    spxPriceMap[row.date] = row.close;
  }

  // Forward-fill SPX prices across all dates
  const spxEquityMap: Record<string, number> = {};
  let lastPrice = 0;

  for (const d of allDates) {
    if (spxPriceMap[d] != null) {
      lastPrice = spxPriceMap[d];
    }
    spxEquityMap[d] = lastPrice;
  }

  // 5. Convert SPX prices to "return-style" equity (so it can be normalized with portfolio)
  // Take first non-zero price as base
  const firstPriceEntry = allDates.find((d) => spxEquityMap[d] !== 0);
  const basePrice = firstPriceEntry ? spxEquityMap[firstPriceEntry] : 0;

  const rawPoints: MultiCurvePoint[] = allDates.map((d) => ({
    date: d,
    combined: combinedEquityMap[d] ?? 0,
    swing: swingEquityMap[d] ?? 0,
    intraday: intradayEquityMap[d] ?? 0,
    spx: basePrice ? spxEquityMap[d] - basePrice : 0, // price delta
  }));

  if (!rawPoints.length) {
    return { points: [] };
  }

  // 6. Normalize all curves so the first point is 0
  const first = rawPoints[0];

  const normalized: MultiCurvePoint[] = rawPoints.map((p) => ({
    date: p.date,
    combined: p.combined - first.combined,
    swing: p.swing - first.swing,
    intraday: p.intraday - first.intraday,
    spx: p.spx - first.spx,
  }));

  // 7. Apply downsampling if needed
  const downsampled = downsampleMultiCurve(normalized, maxPoints);

  return { points: downsampled };
}

// ============================================================================
// CANONICAL DRAWDOWN BUILDER
// ============================================================================

/**
 * Build drawdown curves for combined, swing, intraday, and SPX.
 *
 * The function:
 *  - gets aligned, normalized equity curves
 *  - computes drawdown as: equity - maxToDate
 *  - ensures curves share the same date index
 *
 * Output values are negative (or 0).
 */
export async function buildDrawdownCurves(
  userId: number,
  opts: EquityCurveOptions = {}
): Promise<DrawdownResult> {
  // Step 1 — get the already aligned, normalized equity curves
  const { points: eq } = await buildAggregatedEquityCurve(userId, opts);

  if (!eq.length) {
    return { points: [] };
  }

  // Running peaks
  let peakCombined = eq[0].combined;
  let peakSwing = eq[0].swing;
  let peakIntraday = eq[0].intraday;
  let peakSPX = eq[0].spx;

  const dd: DrawdownPoint[] = eq.map((p) => {
    peakCombined = Math.max(peakCombined, p.combined);
    peakSwing = Math.max(peakSwing, p.swing);
    peakIntraday = Math.max(peakIntraday, p.intraday);
    peakSPX = Math.max(peakSPX, p.spx);

    return {
      date: p.date,
      combined: p.combined - peakCombined,
      swing: p.swing - peakSwing,
      intraday: p.intraday - peakIntraday,
      spx: p.spx - peakSPX,
    };
  });

  return { points: dd };
}

// ============================================================================
// DATABASE LOADERS
// ============================================================================

/**
 * Load daily PnL data for all strategies
 */
async function loadStrategyDailyRowsFromDb(
  userId: number,
  startDate?: string,
  endDate?: string
): Promise<StrategyDailyRow[]> {
  const db = await getDb();
  if (!db) return [];

  // Build date filter conditions
  const conditions = [
    eq(trades.userId, userId),
    isNotNull(trades.exitTime),
    isNotNull(trades.exitPrice),
  ];

  if (startDate) {
    conditions.push(gte(trades.exitTime, new Date(startDate)));
  }
  if (endDate) {
    conditions.push(lte(trades.exitTime, new Date(endDate)));
  }

  // Load all trades with strategy info
  const tradesList = await db
    .select({
      exitTime: trades.exitTime,
      entryPrice: trades.entryPrice,
      exitPrice: trades.exitPrice,
      quantity: trades.quantity,
      side: trades.side,
      // fees: trades.fees, // Not in schema
      strategyId: trades.strategyId,
      strategyName: strategies.name,
      strategyType: strategies.type,
    })
    .from(trades)
    .leftJoin(strategies, eq(trades.strategyId, strategies.id))
    .where(and(...conditions))
    .orderBy(trades.exitTime);

  // Group by date and strategy, sum PnL
  const dailyMap = new Map<string, StrategyDailyRow>();

  for (const trade of tradesList) {
    if (!trade.exitTime || !trade.strategyId || !trade.strategyName) continue;

    const date = normalizeToDateKey(trade.exitTime);
    const key = `${date}-${trade.strategyId}`;

    // Calculate PnL
    const entryPrice = parseFloat(trade.entryPrice);
    const exitPrice = parseFloat(trade.exitPrice || '0');
    const quantity = parseFloat(trade.quantity);
    const fees = 0; // Fees not in schema yet

    let grossPnl = 0;
    const side = trade.side.toLowerCase();
    
    if (side === 'long' || side === 'buy') {
      grossPnl = (exitPrice - entryPrice) * quantity;
    } else if (side === 'short' || side === 'sell') {
      grossPnl = (entryPrice - exitPrice) * quantity;
    }

    const pnl = grossPnl - fees;

    if (!dailyMap.has(key)) {
      dailyMap.set(key, {
        date,
        strategyId: trade.strategyId,
        strategyName: trade.strategyName,
        strategyType: (trade.strategyType as StrategyType) || 'intraday',
        dailyPnl: 0,
      });
    }

    const row = dailyMap.get(key)!;
    row.dailyPnl += pnl;
  }

  return Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Load SPX benchmark prices
 */
async function loadBenchmarkDailyRowsFromDb(
  startDate?: string,
  endDate?: string
): Promise<BenchmarkDailyRow[]> {
  const db = await getDb();
  if (!db) return [];

  const conditions = [eq(benchmarks.symbol, 'SPX')];

  if (startDate) {
    conditions.push(gte(benchmarks.date, new Date(startDate)));
  }
  if (endDate) {
    conditions.push(lte(benchmarks.date, new Date(endDate)));
  }

  const rows = await db
    .select({
      date: benchmarks.date,
      close: benchmarks.close,
    })
    .from(benchmarks)
    .where(and(...conditions))
    .orderBy(benchmarks.date);

  return rows.map((r) => ({
    date: normalizeToDateKey(r.date),
    close: parseFloat(r.close),
  }));
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Normalize a Date to daily key (YYYY-MM-DD in UTC)
 */
function normalizeToDateKey(d: Date): string {
  const utc = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  return utc.toISOString().split('T')[0];
}

/**
 * Downsample multi-curve data to prevent chart overload
 */
function downsampleMultiCurve(
  points: MultiCurvePoint[],
  maxPoints: number
): MultiCurvePoint[] {
  if (points.length <= maxPoints) return points;

  const step = Math.ceil(points.length / maxPoints);
  const out: MultiCurvePoint[] = [];

  for (let i = 0; i < points.length; i += step) {
    out.push(points[i]);
  }

  // ensure last point is included
  const last = points[points.length - 1];
  if (out[out.length - 1].date !== last.date) {
    out.push(last);
  }

  return out;
}
