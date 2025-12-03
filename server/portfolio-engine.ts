import { and, between, desc, eq, gte, inArray, isNull, lte, sql } from "drizzle-orm";
import {
  DrawdownPoint,
  DrawdownResponse,
  EquityCurvePoint,
  EquityCurveResponse,
  PortfolioOverview,
  PortfolioSummary,
  StrategyComparisonResult,
  StrategyComparisonRow,
  StrategySummary,
  StrategyType,
  TradeRow,
  MonteCarloResult,
  ExportTradesInput,
  PortfolioMetrics,
} from "@shared/types/portfolio";
import {
  benchmarks as sampleBenchmarks,
  strategies as sampleStrategies,
  trades as sampleTrades,
} from "@server/db/sampleData";
import { getDb, schema } from "@server/db";
import {
  computeReturnMetrics,
  computeTradeMetrics,
  safeNumber as metricsSafeNumber,
  sharpe as sharpeRatio,
} from "./engine/metrics";

export interface EquityCurveOptions {
  startDate?: string; // derived from time range selector
  endDate?: string; // derived from time range selector
  maxPoints?: number;
  strategyIds?: number[];
}

export interface UserScope {
  userId: number;
}

export interface StrategyComparisonInput {
  userId: number;
  page: number;
  pageSize: number;
  sortBy: keyof StrategyComparisonRow;
  sortOrder: "asc" | "desc";
  filterType: "all" | StrategyType;
  search?: string;
  startDate?: string; // derived from time range selector
  endDate?: string; // derived from time range selector
}

export interface TradeLoadOptions {
  startDate?: string; // derived from time range selector
  endDate?: string; // derived from time range selector
  strategyIds?: number[];
  symbol?: string;
  side?: string;
}

interface PaginatedTradeLoadOptions extends TradeLoadOptions {
  page: number;
  pageSize: number;
}

export const ENGINE_CONFIG = {
  initialCapital: 100_000,
  tradingDays: 252,
};
const safeNumber = metricsSafeNumber;

type TradeRecord = {
  id: number;
  strategyId: number;
  userId: number;
  symbol: string;
  side: string;
  quantity: unknown;
  entryPrice: unknown;
  exitPrice: unknown;
  entryTime: Date | string;
  exitTime: Date | string;
  deletedAt?: Date | string | null;
};

function tradePnl(side: string, entry: number, exit: number, qty: number): number {
  const normalizedSide = side.toLowerCase();
  if (normalizedSide === "short" || normalizedSide === "sell") {
    return (entry - exit) * qty;
  }
  return (exit - entry) * qty;
}

function normalizeToDateKey(date: Date): string {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();

  const mm = month < 10 ? `0${month}` : String(month);
  const dd = day < 10 ? `0${day}` : String(day);

  return `${year}-${mm}-${dd}`;
}

function downsamplePoints<T extends { date: string }>(points: T[], maxPoints: number): T[] {
  const n = points.length;
  if (!Array.isArray(points) || n === 0 || maxPoints <= 0) return [];
  if (n <= maxPoints) return points;

  const sampled: T[] = [];
  const buckets = maxPoints - 2;
  const bucketSize = (n - 2) / buckets;

  let a = 0;
  sampled.push(points[a]);

  for (let i = 0; i < buckets; i++) {
    const bucketStart = Math.floor(1 + i * bucketSize);
    const bucketEnd = Math.floor(1 + (i + 1) * bucketSize);
    const bucketEndClamped = Math.min(bucketEnd, n - 1);

    const rangeStart = bucketStart;
    const rangeEnd = bucketEndClamped;

    if (rangeStart >= rangeEnd) continue;

    const nextBucketStart = bucketEndClamped;
    const nextBucketEnd = Math.min(Math.floor(1 + (i + 2) * bucketSize), n);

    let avgX = 0;
    let avgY = 0;
    let avgCount = 0;

    for (let j = nextBucketStart; j < nextBucketEnd; j++) {
      const x = j;
      const y = getY(points[j]);
      avgX += x;
      avgY += y;
      avgCount++;
    }

    if (avgCount > 0) {
      avgX /= avgCount;
      avgY /= avgCount;
    } else {
      avgX = nextBucketStart;
      avgY = getY(points[nextBucketStart]);
    }

    const pointA = points[a];
    const ax = a;
    const ay = getY(pointA);

    let maxArea = -1;
    let chosenIndex = rangeStart;

    for (let j = rangeStart; j < rangeEnd; j++) {
      const px = j;
      const py = getY(points[j]);
      const area = Math.abs((ax - avgX) * (py - ay) - (ax - px) * (avgY - ay));
      if (area > maxArea) {
        maxArea = area;
        chosenIndex = j;
      }
    }

    sampled.push(points[chosenIndex]);
    a = chosenIndex;
  }

  sampled.push(points[n - 1]);

  sampled.sort((a, b) => {
    const idxA = points.indexOf(a);
    const idxB = points.indexOf(b);
    return idxA - idxB;
  });

  return sampled;

  function getY(p: any): number {
    if (typeof p.combined === "number" && Number.isFinite(p.combined)) {
      return p.combined;
    }
    return 0;
  }
}

function normalizeWeights(strategyIds: number[], weights: number[]): number[] {
  const n = strategyIds.length;
  if (!n) return [];
  const padded = strategyIds.map((_, idx) => (Number.isFinite(weights[idx]) ? Number(weights[idx]) : 1));
  const sum = padded.reduce((acc, val) => acc + (Number.isFinite(val) ? Number(val) : 0), 0);
  if (!Number.isFinite(sum) || sum === 0) {
    return Array.from({ length: n }, () => 1 / n);
  }
  return padded.map(val => (Number.isFinite(val) ? Number(val) / sum : 0));
}

function rebaseEquitySeries(points: EquityCurvePoint[]) {
  if (!points.length) return;
  const base = points[0];
  for (const p of points) {
    p.combined -= base.combined;
    p.swing -= base.swing;
    p.intraday -= base.intraday;
    p.spx -= base.spx;
  }
}

export async function loadStrategies(scope: UserScope): Promise<StrategySummary[]> {
  const { userId } = scope;
  const db = await getDb();
  if (db) {
    const rows = await db
      .select({ id: schema.strategies.id, name: schema.strategies.name, type: schema.strategies.type, description: schema.strategies.description })
      .from(schema.strategies)
      .where(eq(schema.strategies.userId, userId));
    if (rows.length > 0) {
      return rows.map((r: any) => ({
        id: r.id,
        name: r.name,
        type: r.type as StrategyType,
        description: r.description ?? undefined,
      }));
    }
  }
  return sampleStrategies.filter(s => s.userId === userId);
}

export async function loadTrades(scope: UserScope, opts: TradeLoadOptions = {}): Promise<TradeRow[]> {
  const db = await getDb();
  const predicates = buildTradePredicates(scope, opts);
  if (db) {
    const baseQuery = db
      .select({
        id: schema.trades.id,
        strategyId: schema.trades.strategyId,
        userId: schema.trades.userId,
        symbol: schema.trades.symbol,
        side: schema.trades.side,
        quantity: schema.trades.quantity,
        entryPrice: schema.trades.entryPrice,
        exitPrice: schema.trades.exitPrice,
        entryTime: schema.trades.entryTime,
        exitTime: schema.trades.exitTime,
        deletedAt: schema.trades.deletedAt,
      })
      .from(schema.trades)
      .where(and(...predicates));

    const rows: TradeRecord[] = typeof (baseQuery as any).orderBy === "function"
      ? await (baseQuery as any).orderBy(desc(schema.trades.exitTime))
      : await baseQuery;

    const activeRows = rows.filter(trade => !trade.deletedAt);
    if (activeRows.length > 0) {
      const mapped = mapTradeRows(activeRows);
      return applyTradeFilters(mapped, opts);
    }
    return [];
  }

  return filterSampleTrades(scope, opts);
}

export async function loadTradesPage(scope: UserScope, opts: PaginatedTradeLoadOptions): Promise<{ rows: TradeRow[]; total: number }> {
  const page = Math.max(1, opts.page);
  const pageSize = Math.min(Math.max(1, opts.pageSize), 500);
  const db = await getDb();
  const predicates = buildTradePredicates(scope, opts);

  if (!db) {
    const allRows = filterSampleTrades(scope, opts);
    const start = (page - 1) * pageSize;
    return { rows: allRows.slice(start, start + pageSize), total: allRows.length };
  }

  const rows: TradeRecord[] = await db
    .select({
      id: schema.trades.id,
      strategyId: schema.trades.strategyId,
      userId: schema.trades.userId,
      symbol: schema.trades.symbol,
      side: schema.trades.side,
      quantity: schema.trades.quantity,
      entryPrice: schema.trades.entryPrice,
      exitPrice: schema.trades.exitPrice,
      entryTime: schema.trades.entryTime,
      exitTime: schema.trades.exitTime,
      deletedAt: schema.trades.deletedAt,
    })
    .from(schema.trades)
    .where(and(...predicates))
    .orderBy(desc(schema.trades.exitTime))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.trades)
    .where(and(...predicates));

  return { rows: mapTradeRows(rows.filter(trade => !trade.deletedAt)), total: Number(count) };
}

function buildTradePredicates(scope: UserScope, opts: TradeLoadOptions) {
  const predicates = [eq(schema.trades.userId, scope.userId), isNull(schema.trades.deletedAt)];
  if (opts.startDate) {
    predicates.push(gte(schema.trades.exitTime, new Date(`${opts.startDate}T00:00:00.000Z`)));
  }
  if (opts.endDate) {
    predicates.push(lte(schema.trades.exitTime, new Date(`${opts.endDate}T23:59:59.999Z`)));
  }
  if (opts.strategyIds && opts.strategyIds.length > 0) {
    predicates.push(inArray(schema.trades.strategyId, opts.strategyIds));
  }
  if (opts.symbol) {
    predicates.push(eq(schema.trades.symbol, opts.symbol));
  }
  if (opts.side) {
    predicates.push(eq(schema.trades.side, opts.side));
  }
  return predicates;
}

function mapTradeRows(rows: TradeRecord[]): TradeRow[] {
  return rows.map((trade): TradeRow => ({
    id: trade.id,
    strategyId: trade.strategyId,
    userId: trade.userId,
    symbol: trade.symbol,
    side: trade.side,
    quantity: Number(trade.quantity),
    entryPrice: Number(trade.entryPrice),
    exitPrice: Number(trade.exitPrice),
    entryTime: new Date(trade.entryTime).toISOString(),
    exitTime: new Date(trade.exitTime).toISOString(),
  }));
}

function applyTradeFilters(rows: TradeRow[], opts: TradeLoadOptions): TradeRow[] {
  if (!opts.startDate && !opts.endDate && !opts.strategyIds?.length && !opts.symbol && !opts.side) {
    return rows;
  }

  return rows.filter(row => {
    const exitDate = row.exitTime.slice(0, 10);
    if (opts.startDate && exitDate < opts.startDate) return false;
    if (opts.endDate && exitDate > opts.endDate) return false;
    if (opts.strategyIds && opts.strategyIds.length > 0 && !opts.strategyIds.includes(row.strategyId)) return false;
    if (opts.symbol && row.symbol !== opts.symbol) return false;
    if (opts.side && row.side !== opts.side) return false;
    return true;
  });
}

function filterSampleTrades(scope: UserScope, opts: TradeLoadOptions): TradeRow[] {
  return sampleTrades
    .filter(t => t.userId === scope.userId)
    .filter(t => {
      const exitDate = t.exitTime.slice(0, 10);
      if (opts.startDate && exitDate < opts.startDate) return false;
      if (opts.endDate && exitDate > opts.endDate) return false;
      if (opts.strategyIds && opts.strategyIds.length > 0 && !opts.strategyIds.includes(t.strategyId)) return false;
      if (opts.symbol && t.symbol !== opts.symbol) return false;
      if (opts.side && t.side !== opts.side) return false;
      return true;
    });
}

async function loadBenchmarks(scope: UserScope, startDate?: string, endDate?: string) {
  const db = await getDb();
  if (db) {
    type BenchmarkRecord = { date: string; close: unknown; deletedAt?: Date | string | null; userId?: number };

    const predicates: any[] = [isNull(schema.benchmarks.deletedAt), eq(schema.benchmarks.userId, scope.userId)];
    if (startDate && endDate) {
      predicates.push(between(schema.benchmarks.date, startDate, endDate));
    } else if (startDate) {
      predicates.push(gte(schema.benchmarks.date, startDate));
    } else if (endDate) {
      predicates.push(lte(schema.benchmarks.date, endDate));
    }

    const rows: BenchmarkRecord[] = await db
      .select({
        date: schema.benchmarks.date,
        close: schema.benchmarks.close,
        deletedAt: schema.benchmarks.deletedAt,
        userId: schema.benchmarks.userId,
      })
      .from(schema.benchmarks)
      .where(predicates.length ? and(...predicates) : undefined);

    return rows
      .filter(row => !row.deletedAt)
      .map((row): { date: string; close: number } => ({ date: row.date, close: Number(row.close) }));
  }

  return sampleBenchmarks.filter(row => {
    if (row.userId !== scope.userId) return false;
    if (startDate && row.date < startDate) return false;
    if (endDate && row.date > endDate) return false;
    return true;
  });
}

export async function buildAggregatedEquityCurve(
  scope: UserScope,
  opts: EquityCurveOptions = {},
): Promise<EquityCurveResponse> {
  const { startDate, endDate, maxPoints, strategyIds } = opts;
  const [strategies, trades, benchmarkRows] = await Promise.all([
    loadStrategies(scope),
    loadTrades(scope, { startDate, endDate, strategyIds }),
    loadBenchmarks(scope, startDate, endDate),
  ]);

  const typeByStrategy = new Map<number, StrategyType>();
  for (const s of strategies) typeByStrategy.set(s.id, s.type);

  const dateSet = new Set<string>();

  type DailyBucket = { swing: number; intraday: number; combined: number };
  const pnlByDate = new Map<string, DailyBucket>();

  for (const trade of trades) {
    const exit = new Date(trade.exitTime);
    const isoDate = normalizeToDateKey(exit);
    if (startDate && isoDate < startDate) continue;
    if (endDate && isoDate > endDate) continue;

    dateSet.add(isoDate);
    const bucket = pnlByDate.get(isoDate) ?? { swing: 0, intraday: 0, combined: 0 };
    const strategyType = typeByStrategy.get(trade.strategyId) ?? "swing";
    const pnl = tradePnl(trade.side, Number(trade.entryPrice), Number(trade.exitPrice), Number(trade.quantity));

    if (strategyType === "intraday") bucket.intraday += pnl; else bucket.swing += pnl;
    bucket.combined += pnl;
    pnlByDate.set(isoDate, bucket);
  }

  for (const b of benchmarkRows) {
    if (startDate && b.date < startDate) continue;
    if (endDate && b.date > endDate) continue;
    dateSet.add(b.date);
  }

  const dates = Array.from(dateSet).sort();
  const points: EquityCurvePoint[] = [];

  let combined = 0;
  let swing = 0;
  let intraday = 0;
  let baseBenchmark: number | null = null;
  let benchmarkEquity = 0;

  for (const d of dates) {
    const pnl = pnlByDate.get(d);
    if (pnl) {
      combined += pnl.combined;
      swing += pnl.swing;
      intraday += pnl.intraday;
    }
    const benchmark = benchmarkRows.find(b => b.date === d);
    if (benchmark) {
      if (baseBenchmark == null) baseBenchmark = benchmark.close;
      benchmarkEquity = benchmark.close - (baseBenchmark ?? benchmark.close);
    }

    points.push({ date: d, combined, swing, intraday, spx: benchmarkEquity });
  }

  if (points.length > 0) {
    const base = points[0];
    for (const p of points) {
      p.combined -= base.combined;
      p.swing -= base.swing;
      p.intraday -= base.intraday;
      p.spx -= base.spx;
    }
  }

  if (maxPoints && points.length > maxPoints) {
    return { points: downsamplePoints(points, maxPoints) };
  }

  return { points };
}

export async function buildDrawdownCurves(
  scope: UserScope,
  opts: EquityCurveOptions = {},
): Promise<DrawdownResponse> {
  const equity = await buildAggregatedEquityCurve(scope, opts);
  const pts = equity.points;
  if (pts.length === 0) return { points: [] };

  const ddPoints = buildDrawdownSeries(pts);

  if (opts.maxPoints && ddPoints.length > opts.maxPoints) {
    return { points: downsamplePoints(ddPoints, opts.maxPoints) };
  }

  return { points: ddPoints };
}

export async function buildCustomPortfolio(
  scope: UserScope,
  opts: { strategyIds: number[]; weights?: number[]; startDate?: string; endDate?: string; maxPoints?: number },
) {
  const { strategyIds, weights = [] } = opts;
  if (!strategyIds.length) return { metrics: null, equityCurve: { points: [] }, contributions: [] };

  const strategies = await loadStrategies(scope);
  const strategyMap = new Map<number, StrategySummary>();
  for (const strat of strategies) strategyMap.set(strat.id, strat);

  const selectedStrategies = strategyIds.map(id => strategyMap.get(id)).filter(Boolean) as StrategySummary[];
  if (selectedStrategies.length !== strategyIds.length) {
    throw new Error("One or more strategies could not be found for this portfolio");
  }

  const normalizedWeights = normalizeWeights(strategyIds, weights);
  const weightById = new Map<number, number>();
  strategyIds.forEach((id, idx) => weightById.set(id, normalizedWeights[idx]));

  const trades = await loadTrades(scope, {
    startDate: opts.startDate,
    endDate: opts.endDate,
    strategyIds,
  });

  const tradeCounts = new Map<number, number>();
  const pnlByStrategyDate = new Map<number, Map<string, number>>();
  const dateSet = new Set<string>();

  for (const trade of trades) {
    const exit = new Date(trade.exitTime);
    const isoDate = normalizeToDateKey(exit);
    if (opts.startDate && isoDate < opts.startDate) continue;
    if (opts.endDate && isoDate > opts.endDate) continue;

    dateSet.add(isoDate);
    const strategyBucket = pnlByStrategyDate.get(trade.strategyId) ?? new Map<string, number>();
    const pnl = tradePnl(trade.side, Number(trade.entryPrice), Number(trade.exitPrice), Number(trade.quantity));
    strategyBucket.set(isoDate, (strategyBucket.get(isoDate) ?? 0) + pnl);
    pnlByStrategyDate.set(trade.strategyId, strategyBucket);
    tradeCounts.set(trade.strategyId, (tradeCounts.get(trade.strategyId) ?? 0) + 1);
  }

  const benchmarkRows = await loadBenchmarks(scope, opts.startDate, opts.endDate);
  for (const b of benchmarkRows) {
    if (opts.startDate && b.date < opts.startDate) continue;
    if (opts.endDate && b.date > opts.endDate) continue;
    dateSet.add(b.date);
  }

  const dates = Array.from(dateSet).sort();
  const benchmarkEquityByDate = new Map<string, number>();
  let baseBenchmark: number | null = null;
  let benchmarkEquity = 0;
  for (const d of dates) {
    const bench = benchmarkRows.find(b => b.date === d);
    if (bench) {
      if (baseBenchmark == null) baseBenchmark = bench.close;
      benchmarkEquity = bench.close - (baseBenchmark ?? bench.close);
    }
    benchmarkEquityByDate.set(d, benchmarkEquity);
  }

  const strategyCurves = new Map<number, EquityCurvePoint[]>();
  const cumulativeByStrategy = new Map<number, number>();
  for (const id of strategyIds) {
    strategyCurves.set(id, []);
    cumulativeByStrategy.set(id, 0);
  }

  const combinedPoints: EquityCurvePoint[] = [];

  for (const d of dates) {
    let combined = 0;
    let swing = 0;
    let intraday = 0;
    const benchmarkValue = benchmarkEquityByDate.get(d) ?? 0;

    for (const id of strategyIds) {
      const dailyMap = pnlByStrategyDate.get(id);
      const pnl = dailyMap?.get(d) ?? 0;
      const cumulative = (cumulativeByStrategy.get(id) ?? 0) + pnl;
      cumulativeByStrategy.set(id, cumulative);

      const strategy = strategyMap.get(id);
      const type = strategy?.type ?? "swing";
      const stratPoint: EquityCurvePoint = {
        date: d,
        combined: cumulative,
        swing: type === "swing" ? cumulative : 0,
        intraday: type === "intraday" ? cumulative : 0,
        spx: benchmarkValue,
      };
      strategyCurves.get(id)?.push(stratPoint);

      const weight = weightById.get(id) ?? 0;
      combined += weight * cumulative;
      if (type === "intraday") intraday += weight * cumulative; else swing += weight * cumulative;
    }

    combinedPoints.push({ date: d, combined, swing, intraday, spx: benchmarkValue });
  }

  rebaseEquitySeries(combinedPoints);
  for (const curve of strategyCurves.values()) {
    rebaseEquitySeries(curve);
  }

  const initialCapital = ENGINE_CONFIG.initialCapital;
  const analytics = deriveEquityAnalytics(combinedPoints, initialCapital);
  const equityReturns = computeDailyReturns(combinedPoints, initialCapital).filter(r => Number.isFinite(r));
  const benchmarkReturns = computeDailyReturns(combinedPoints, initialCapital, "spx").filter(r => Number.isFinite(r));
  const returnMetrics = computeReturnMetrics(equityReturns, { periodsPerYear: ENGINE_CONFIG.tradingDays });
  const benchmarkMetrics =
    benchmarkReturns.length > 0
      ? computeReturnMetrics(benchmarkReturns, { periodsPerYear: ENGINE_CONFIG.tradingDays })
      : null;

  const tradeSamples = trades.map(trade => {
    const weight = weightById.get(trade.strategyId) ?? 0;
    const pnl =
      tradePnl(trade.side, Number(trade.entryPrice), Number(trade.exitPrice), Number(trade.quantity)) * weight;
    const initialRisk = (trade as any).initialRisk ? Number((trade as any).initialRisk) * weight : undefined;
    return { pnl, initialRisk };
  });

  const tradeMetrics = computeTradeMetrics(tradeSamples);

  const portfolioMetrics: PortfolioMetrics = {
    totalReturnPct: analytics.totalReturnPct ?? 0,
    cagrPct: analytics.cagr * 100,
    volatilityPct: analytics.volatility * 100,
    sharpe: analytics.sharpeRatio,
    sortino: analytics.sortinoRatio ?? 0,
    calmar: analytics.calmar ?? 0,
    maxDrawdownPct: analytics.maxDrawdownPct,
    winRatePct: tradeMetrics.winRate * 100,
    lossRatePct: tradeMetrics.lossRate * 100,
    avgWin: tradeMetrics.avgWin,
    avgLoss: tradeMetrics.avgLoss,
    payoffRatio: tradeMetrics.payoffRatio,
    profitFactor: safeNumber(tradeMetrics.profitFactor),
    expectancyPerTrade: tradeMetrics.expectancyPerTrade,
    alpha: benchmarkMetrics ? returnMetrics.totalReturn - benchmarkMetrics.totalReturn : null,
  };

  const contributions = strategyIds.map(id => {
    const curve = strategyCurves.get(id) ?? [];
    const analyticsForStrategy = deriveEquityAnalytics(curve, initialCapital);
    const strat = strategyMap.get(id);
    return {
      strategyId: id,
      name: strat?.name ?? `Strategy ${id}`,
      weight: weightById.get(id) ?? 0,
      totalReturnPct: analyticsForStrategy.totalReturnPct ?? 0,
      maxDrawdownPct: analyticsForStrategy.maxDrawdownPct,
      sharpeRatio: analyticsForStrategy.sharpeRatio,
      tradeCount: tradeCounts.get(id) ?? 0,
    };
  });

  const points = opts.maxPoints && combinedPoints.length > opts.maxPoints
    ? downsamplePoints(combinedPoints, opts.maxPoints)
    : combinedPoints;

  return { metrics: portfolioMetrics, equityCurve: { points }, contributions };
}

export function computeSharpeRatio(returns: number[]): number {
  return sharpeRatio(returns, { periodsPerYear: ENGINE_CONFIG.tradingDays });
}

export function computeDailyReturns(
  points: EquityCurvePoint[],
  initialCapital: number,
  key: keyof EquityCurvePoint = "combined",
): number[] {
  if (!Array.isArray(points) || points.length === 0) return [];

  let prevEquity = initialCapital;
  const returns: number[] = [];

  for (const p of points) {
    const equityValue = Number((p as unknown as Record<string, unknown>)[key] ?? 0);
    const equity = initialCapital + safeNumber(equityValue);
    const dailyPnL = equity - prevEquity;
    const dailyReturn = prevEquity !== 0 ? dailyPnL / prevEquity : 0;
    returns.push(safeNumber(dailyReturn));
    prevEquity = equity;
  }

  return returns;
}

function computeDrawdownMetrics(points: EquityCurvePoint[], initialCapital: number) {
  if (!points.length) {
    return { maxDrawdown: 0, currentDrawdown: 0, maxDrawdownPct: 0 };
  }

  let peakEquity = initialCapital;
  let maxDrawdown = 0;
  let currentDrawdown = 0;
  let maxDrawdownPct = 0;

  for (const p of points) {
    const equity = initialCapital + safeNumber(p.combined);
    peakEquity = Math.max(peakEquity, equity);
    const dd = equity - peakEquity;
    currentDrawdown = dd;
    if (dd < maxDrawdown) {
      maxDrawdown = dd;
      maxDrawdownPct = peakEquity > 0 ? dd / peakEquity : 0;
    }
  }

  return {
    maxDrawdown,
    currentDrawdown,
    maxDrawdownPct,
  };
}

function buildDrawdownSeries(points: EquityCurvePoint[]): DrawdownPoint[] {
  if (points.length === 0) return [];

  let peakCombined = points[0].combined;
  let peakSwing = points[0].swing;
  let peakIntraday = points[0].intraday;
  let peakSpx = points[0].spx;

  const ddPoints: DrawdownPoint[] = [];

  for (const p of points) {
    peakCombined = Math.max(peakCombined, p.combined);
    peakSwing = Math.max(peakSwing, p.swing);
    peakIntraday = Math.max(peakIntraday, p.intraday);
    peakSpx = Math.max(peakSpx, p.spx);

    ddPoints.push({
      date: p.date,
      combined: p.combined - peakCombined,
      swing: p.swing - peakSwing,
      intraday: p.intraday - peakIntraday,
      spx: p.spx - peakSpx,
    });
  }

  return ddPoints;
}

function deriveEquityAnalytics(points: EquityCurvePoint[], initialCapital: number) {
  const dailyReturns = computeDailyReturns(points, initialCapital).filter(r => Number.isFinite(r));
  const equitySeries = points.map(p => initialCapital + safeNumber(p.combined));
  const latestEquity = equitySeries.at(-1) ?? initialCapital;
  const previousEquity = equitySeries.length > 1 ? equitySeries[equitySeries.length - 2] : latestEquity;

  const rawDailyPnL = latestEquity - previousEquity;
  const rawDailyReturn = previousEquity !== 0 ? rawDailyPnL / previousEquity : 0;
  const rawTotalReturn = latestEquity - initialCapital;

  const { maxDrawdown, currentDrawdown } = computeDrawdownMetrics(points, initialCapital);
  const returnMetrics = computeReturnMetrics(dailyReturns, {
    periodsPerYear: ENGINE_CONFIG.tradingDays,
  });

  return {
    dailyPnL: safeNumber(rawDailyPnL),
    dailyReturn: safeNumber(rawDailyReturn),
    totalReturn: safeNumber(rawTotalReturn),
    totalReturnPct: safeNumber(returnMetrics.totalReturn * 100),
    sharpeRatio: safeNumber(returnMetrics.sharpe),
    sortinoRatio: safeNumber(returnMetrics.sortino),
    cagr: safeNumber(returnMetrics.cagr),
    calmar: safeNumber(returnMetrics.calmar),
    volatility: safeNumber(returnMetrics.volatility),
    maxDrawdown: safeNumber(maxDrawdown),
    currentDrawdown: safeNumber(currentDrawdown),
    maxDrawdownPct: safeNumber(returnMetrics.maxDrawdown.maxDrawdown * 100),
  };
}

export async function buildStrategyComparison(
  input: StrategyComparisonInput,
): Promise<StrategyComparisonResult> {
  const db = await getDb();
  const useDb = Boolean(db);
  const scope: UserScope = { userId: input.userId };
  const trades = useDb
    ? await loadTrades(scope, { startDate: input.startDate, endDate: input.endDate })
    : sampleTrades.filter(t => {
        if (t.userId !== input.userId) return false;
        const exitDate = t.exitTime.slice(0, 10);
        if (input.startDate && exitDate < input.startDate) return false;
        if (input.endDate && exitDate > input.endDate) return false;
        return true;
      });
  const strategies = useDb ? await loadStrategies(scope) : sampleStrategies.filter(s => s.userId === input.userId);

  const rows = trades.map(trade => {
    const strat = strategies.find(s => s.id === trade.strategyId);
    const type = strat?.type ?? "swing";
    const pnl = tradePnl(trade.side, Number(trade.entryPrice), Number(trade.exitPrice), Number(trade.quantity));
    const notional = Math.abs(Number(trade.entryPrice) * Number(trade.quantity));
    const retPct = notional > 0 ? pnl / notional : 0;

    return {
      strategyId: trade.strategyId,
      name: strat?.name ?? `Strategy ${trade.strategyId}`,
      type,
      pnl,
      notional,
      exitTime: trade.exitTime,
      retPct,
    };
  });

  type AggRow = {
    strategyId: number;
    name: string;
    type: StrategyType;
    pnl: number;
    notional: number;
    tradeReturns: number[];
    pnls: number[];
    totalTrades: number;
    wins: number;
    losses: number;
    grossProfit: number;
    grossLoss: number;
  };

  const map = new Map<number, AggRow>();

  for (const row of rows) {
    let agg = map.get(row.strategyId);
    if (!agg) {
      agg = {
        strategyId: row.strategyId,
        name: row.name,
        type: row.type,
        pnl: 0,
        notional: 0,
        tradeReturns: [],
        pnls: [],
        totalTrades: 0,
        wins: 0,
        losses: 0,
        grossProfit: 0,
        grossLoss: 0,
      };
      map.set(row.strategyId, agg);
    }

    agg.pnl += row.pnl;
    agg.notional += row.notional;
    agg.tradeReturns.push(row.retPct);
    agg.pnls.push(row.pnl);
    agg.totalTrades += 1;
    if (row.pnl > 0) {
      agg.wins += 1;
      agg.grossProfit += row.pnl;
    } else if (row.pnl < 0) {
      agg.losses += 1;
      agg.grossLoss += Math.abs(row.pnl);
    }
  }

  const comparisonRows: StrategyComparisonRow[] = [];

  for (const agg of map.values()) {
    const returnMetrics = computeReturnMetrics(agg.tradeReturns, { periodsPerYear: ENGINE_CONFIG.tradingDays });
    const tradeMetrics = computeTradeMetrics(agg.pnls.map(pnl => ({ pnl })));

    const totalReturn = agg.pnl;
    const totalReturnPct = returnMetrics.totalReturn * 100;
    let sparkEquity = 1;
    const sparkline = agg.tradeReturns.map((ret, idx) => {
      sparkEquity *= 1 + ret;
      return { date: String(idx), value: sparkEquity - 1 };
    });

    comparisonRows.push({
      strategyId: agg.strategyId,
      name: agg.name,
      type: agg.type,
      totalReturn,
      totalReturnPct,
      maxDrawdown: safeNumber(returnMetrics.maxDrawdown.maxDrawdown),
      maxDrawdownPct: safeNumber(returnMetrics.maxDrawdown.maxDrawdown * 100),
      sharpeRatio: safeNumber(returnMetrics.sharpe),
      sortinoRatio: safeNumber(returnMetrics.sortino),
      cagr: safeNumber(returnMetrics.cagr),
      calmar: safeNumber(returnMetrics.calmar),
      winRatePct: safeNumber(tradeMetrics.winRate * 100),
      lossRatePct: safeNumber(tradeMetrics.lossRate * 100),
      totalTrades: agg.totalTrades,
      profitFactor: safeNumber(tradeMetrics.profitFactor),
      expectancy: tradeMetrics.expectancyPerTrade,
      payoffRatio: tradeMetrics.payoffRatio,
      sparkline,
    });
  }

  let filtered = comparisonRows;
  if (input.filterType !== "all") {
    filtered = filtered.filter(r => r.type === input.filterType);
  }
  if (input.search) {
    const needle = input.search.toLowerCase();
    filtered = filtered.filter(r => r.name.toLowerCase().includes(needle));
  }

  filtered.sort((a, b) => {
    const av = a[input.sortBy];
    const bv = b[input.sortBy];
    if (typeof av === "number" && typeof bv === "number") {
      return input.sortOrder === "asc" ? av - bv : bv - av;
    }
    return 0;
  });

  const start = (input.page - 1) * input.pageSize;
  const end = start + input.pageSize;

  return { rows: filtered.slice(start, end), total: filtered.length };
}

export async function buildPortfolioSummary(
  scope: UserScope,
  opts: { startDate?: string; endDate?: string } = {},
): Promise<PortfolioSummary> {
  const curve = await buildAggregatedEquityCurve(scope, opts);
  const comparison = await buildStrategyComparison({
    userId: scope.userId,
    page: 1,
    pageSize: 100,
    sortBy: "totalReturn",
    sortOrder: "desc",
    filterType: "all",
    startDate: opts.startDate,
    endDate: opts.endDate,
  });

  const { totalReturnPct, maxDrawdownPct, sharpeRatio } = deriveEquityAnalytics(
    curve.points,
    ENGINE_CONFIG.initialCapital,
  );

  const allTrades = comparison.rows.reduce((sum: number, r: StrategyComparisonRow) => sum + r.totalTrades, 0);
  const wins = comparison.rows.reduce(
    (sum: number, r: StrategyComparisonRow) => sum + (r.winRatePct / 100) * r.totalTrades,
    0,
  );
  const winRatePct = allTrades === 0 ? 0 : (wins / allTrades) * 100;

  return {
    totalReturnPct: safeNumber(totalReturnPct ?? 0),
    maxDrawdownPct: safeNumber(maxDrawdownPct),
    sharpeRatio: safeNumber(sharpeRatio),
    winRatePct: safeNumber(winRatePct),
  };
}

export async function buildPortfolioOverview(
  scope: UserScope,
  opts: { startDate?: string; endDate?: string } = {},
): Promise<PortfolioOverview> {
  const [equityCurve, drawdowns, trades] = await Promise.all([
    buildAggregatedEquityCurve(scope, opts),
    buildDrawdownCurves(scope, opts),
    loadTrades(scope, opts),
  ]);

  const initialCapital = ENGINE_CONFIG.initialCapital;
  const equityPoints = equityCurve.points;
  const drawdownPoints = drawdowns.points.length > 0 ? drawdowns.points : buildDrawdownSeries(equityPoints);
  const analytics = deriveEquityAnalytics(equityPoints, initialCapital);

  const tradeSamples = trades.map(t => ({
    pnl: tradePnl(t.side, Number(t.entryPrice), Number(t.exitPrice), Number(t.quantity)),
    initialRisk: (t as any).initialRisk ? Number((t as any).initialRisk) : undefined,
  }));
  const tradeMetrics = computeTradeMetrics(tradeSamples);

  const equityReturns = computeDailyReturns(equityPoints, initialCapital).filter(r => Number.isFinite(r));
  const benchmarkReturns = computeDailyReturns(equityPoints, initialCapital, "spx").filter(r => Number.isFinite(r));
  const returnMetrics = computeReturnMetrics(equityReturns, {
    periodsPerYear: ENGINE_CONFIG.tradingDays,
  });
  const benchmarkMetrics =
    benchmarkReturns.length > 0
      ? computeReturnMetrics(benchmarkReturns, { periodsPerYear: ENGINE_CONFIG.tradingDays })
      : null;

  const portfolioMetrics: PortfolioMetrics = {
    totalReturnPct: analytics.totalReturnPct ?? 0,
    cagrPct: analytics.cagr * 100,
    volatilityPct: analytics.volatility * 100,
    sharpe: analytics.sharpeRatio,
    sortino: analytics.sortinoRatio ?? 0,
    calmar: analytics.calmar ?? 0,
    maxDrawdownPct: analytics.maxDrawdownPct,
    winRatePct: tradeMetrics.winRate * 100,
    lossRatePct: tradeMetrics.lossRate * 100,
    avgWin: tradeMetrics.avgWin,
    avgLoss: tradeMetrics.avgLoss,
    payoffRatio: tradeMetrics.payoffRatio,
    profitFactor: safeNumber(tradeMetrics.profitFactor),
    expectancyPerTrade: tradeMetrics.expectancyPerTrade,
    alpha: benchmarkMetrics ? returnMetrics.totalReturn - benchmarkMetrics.totalReturn : null,
  };

  return {
    equity: safeNumber(initialCapital + (equityPoints.at(-1)?.combined ?? 0)),
    dailyPnL: analytics.dailyPnL,
    dailyReturn: analytics.dailyReturn,
    totalReturn: analytics.totalReturn,
    totalReturnPct: analytics.totalReturnPct ?? 0,
    sharpeRatio: analytics.sharpeRatio,
    sortinoRatio: analytics.sortinoRatio ?? 0,
    cagr: analytics.cagr,
    calmar: analytics.calmar ?? 0,
    volatility: analytics.volatility,
    maxDrawdown: safeNumber(
      drawdownPoints.length ? drawdownPoints.reduce((m, p) => Math.min(m, p.combined), 0) : 0,
    ),
    currentDrawdown: safeNumber(drawdownPoints.at(-1)?.combined ?? 0),
    maxDrawdownPct: portfolioMetrics.maxDrawdownPct,
    totalTrades: tradeSamples.length,
    winningTrades: tradeSamples.filter(t => t.pnl > 0).length,
    losingTrades: tradeSamples.filter(t => t.pnl < 0).length,
    winRate: tradeMetrics.winRate,
    lossRate: tradeMetrics.lossRate,
    profitFactor: safeNumber(tradeMetrics.profitFactor),
    expectancy: tradeMetrics.expectancyPerTrade,
    positions: 0,
    lastUpdated: new Date(),
    metrics: portfolioMetrics,
  };
}

export async function generateTradesCsv(input: ExportTradesInput): Promise<string> {
  const trades = await loadTrades({ userId: input.userId }, {
    startDate: input.startDate,
    endDate: input.endDate,
    strategyIds: input.strategyIds,
  });

  const filtered = trades.filter(trade => {
    if (input.strategyIds && !input.strategyIds.includes(trade.strategyId)) return false;
    const exitDate = trade.exitTime.slice(0, 10);
    if (input.startDate && exitDate < input.startDate) return false;
    if (input.endDate && exitDate > input.endDate) return false;
    return true;
  });

  const header = [
    "Date",
    "Strategy",
    "Symbol",
    "Side",
    "Entry Price",
    "Exit Price",
    "Quantity",
    "P&L",
    "Holding Period (days)",
    "Return %",
  ];

  const lines: string[] = [];
  lines.push(header.map(csvEscape).join(","));

  for (const trade of filtered) {
    const entry = new Date(trade.entryTime);
    const exit = new Date(trade.exitTime);

    const dateStr = normalizeToDateKey(exit);
    const qty = Number(trade.quantity) || 0;
    const entryPrice = Number(trade.entryPrice) || 0;
    const exitPrice = Number(trade.exitPrice) || 0;
    const side = String(trade.side).toLowerCase();

    const pnl = side === "short" || side === "sell" ? (entryPrice - exitPrice) * qty : (exitPrice - entryPrice) * qty;
    const notional = Math.abs(entryPrice * qty);
    const retPct = notional > 0 ? (pnl / notional) * 100 : 0;
    const holdingDays = (exit.getTime() - entry.getTime()) / (1000 * 60 * 60 * 24);

    const rowArr = [
      dateStr,
      trade.strategyId.toString(),
      trade.symbol ?? "",
      trade.side ?? "",
      entryPrice.toFixed(2),
      exitPrice.toFixed(2),
      qty.toString(),
      pnl.toFixed(2),
      holdingDays.toFixed(2),
      retPct.toFixed(2),
    ];

    lines.push(rowArr.map(csvEscape).join(","));
  }

  return lines.join("\n");
}

function csvEscape(value: string): string {
  const v = value.replace(/"/g, '""');
  if (v.search(/("|,|\n)/g) >= 0) {
    return `"${v}"`;
  }
  return v;
}

export async function runMonteCarloSimulation(input: {
  userId: number;
  strategyIds?: number[];
  days: number;
  simulations: number;
  startDate?: string; // derived from time range selector
  endDate?: string; // derived from time range selector
}): Promise<MonteCarloResult> {
  const equity = await buildAggregatedEquityCurve(
    { userId: input.userId },
    {
    startDate: input.startDate,
    endDate: input.endDate,
    },
  );
  const pts = equity.points;
  const initialCapital = ENGINE_CONFIG.initialCapital;
  if (pts.length < 2) {
    return { futureDates: [], p10: [], p50: [], p90: [], currentEquity: initialCapital, finalEquities: [] };
  }

  const dailyReturns = computeDailyReturns(pts, initialCapital);
  const returns = dailyReturns.filter(r => Number.isFinite(r));
  const mean = returns.reduce((a, b) => a + b, 0) / Math.max(returns.length, 1);
  const variance = returns.reduce((a, b) => a + (b - mean) * (b - mean), 0) / Math.max(returns.length - 1, 1);
  const std = Math.sqrt(Math.max(variance, 1e-12));

  const currentEquity = initialCapital + (pts[pts.length - 1]?.combined ?? 0);
  const simResults: number[][] = [];
  const finalEquities: number[] = [];

  for (let s = 0; s < input.simulations; s++) {
    let eq = currentEquity;
    const path: number[] = [];
    for (let d = 0; d < input.days; d++) {
      const r = randomNormal(mean, std);
      eq = eq * (1 + r);
      path.push(eq);
    }
    simResults.push(path);
    if (path.length > 0) finalEquities.push(path[path.length - 1]);
  }

  const percentile = (values: number[], p: number) => {
    if (!values.length) return currentEquity;
    const sorted = [...values].sort((a, b) => a - b);
    const idx = Math.floor(p * (sorted.length - 1));
    return sorted[idx];
  };

  const p10: number[] = [];
  const p50: number[] = [];
  const p90: number[] = [];

  for (let i = 0; i < input.days; i++) {
    const slice = simResults.map(path => path[i]).filter(v => v != null);
    p10.push(percentile(slice, 0.1));
    p50.push(percentile(slice, 0.5));
    p90.push(percentile(slice, 0.9));
  }

  const lastDateStr = pts[pts.length - 1].date;
  const lastDate = new Date(lastDateStr + "T00:00:00.000Z");
  const futureDates: string[] = [];
  for (let i = 1; i <= input.days; i++) {
    const d = new Date(lastDate.getTime() + i * 24 * 60 * 60 * 1000);
    futureDates.push(normalizeToDateKey(d));
  }

  return {
    futureDates,
    p10: p10.map(safeNumber),
    p50: p50.map(safeNumber),
    p90: p90.map(safeNumber),
    currentEquity: safeNumber(currentEquity),
    finalEquities: finalEquities.map(safeNumber),
  };
}

function randomNormal(mean: number, std: number): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  return mean + std * z;
}
