import { and, between, eq, gte, lte } from "drizzle-orm";
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
} from "@shared/types/portfolio";
import {
  benchmarks as sampleBenchmarks,
  strategies as sampleStrategies,
  trades as sampleTrades,
} from "@server/db/sampleData";
import { getDb, schema } from "@server/db";

export interface EquityCurveOptions {
  startDate?: string;
  endDate?: string;
  maxPoints?: number;
}

export interface StrategyComparisonInput {
  userId: number;
  page: number;
  pageSize: number;
  sortBy: keyof StrategyComparisonRow;
  sortOrder: "asc" | "desc";
  filterType: "all" | StrategyType;
  search?: string;
}

export const ENGINE_CONFIG = {
  initialCapital: 100_000,
  tradingDays: 252,
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

export async function loadStrategies(userId: number): Promise<StrategySummary[]> {
  const db = await getDb();
  if (db) {
    const rows = await db.select().from(schema.strategies).where(eq(schema.strategies.userId, userId));
    return rows.map((r: any) => ({
      id: r.id,
      name: r.name,
      type: r.type as StrategyType,
      description: r.description ?? undefined,
    }));
  }
  return sampleStrategies.filter(s => s.userId === userId);
}

export async function loadTrades(userId: number): Promise<TradeRow[]> {
  const db = await getDb();
  if (db) {
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
    };

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
      })
      .from(schema.trades)
      .where(eq(schema.trades.userId, userId));

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
  return sampleTrades.filter(t => t.userId === userId);
}

async function loadBenchmarks(startDate?: string, endDate?: string) {
  const db = await getDb();
  if (db) {
    type BenchmarkRecord = { date: string; close: unknown };

    const predicates: any[] = [];
    if (startDate && endDate) {
      predicates.push(between(schema.benchmarks.date, startDate, endDate));
    } else if (startDate) {
      predicates.push(gte(schema.benchmarks.date, startDate));
    } else if (endDate) {
      predicates.push(lte(schema.benchmarks.date, endDate));
    }

    const rows: BenchmarkRecord[] = await db
      .select({ date: schema.benchmarks.date, close: schema.benchmarks.close })
      .from(schema.benchmarks)
      .where(predicates.length ? and(...predicates) : undefined);

    return rows.map((row): { date: string; close: number } => ({ date: row.date, close: Number(row.close) }));
  }

  return sampleBenchmarks.filter(row => {
    if (startDate && row.date < startDate) return false;
    if (endDate && row.date > endDate) return false;
    return true;
  });
}

export async function buildAggregatedEquityCurve(
  userId: number,
  opts: EquityCurveOptions = {},
): Promise<EquityCurveResponse> {
  const { startDate, endDate, maxPoints } = opts;
  const [strategies, trades, benchmarkRows] = await Promise.all([
    loadStrategies(userId),
    loadTrades(userId),
    loadBenchmarks(startDate, endDate),
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
  userId: number,
  opts: EquityCurveOptions = {},
): Promise<DrawdownResponse> {
  const equity = await buildAggregatedEquityCurve(userId, opts);
  const pts = equity.points;
  if (pts.length === 0) return { points: [] };

  const ddPoints = buildDrawdownSeries(pts);

  if (opts.maxPoints && ddPoints.length > opts.maxPoints) {
    return { points: downsamplePoints(ddPoints, opts.maxPoints) };
  }

  return { points: ddPoints };
}

function computeSharpeRatio(returns: number[]): number {
  const finiteReturns = returns.filter(r => Number.isFinite(r));
  if (!Array.isArray(finiteReturns) || finiteReturns.length < 2) return 0;
  const mean = finiteReturns.reduce((a, b) => a + b, 0) / finiteReturns.length;
  const variance =
    finiteReturns.reduce((a, b) => a + (b - mean) * (b - mean), 0) /
    Math.max(finiteReturns.length - 1, 1);
  const std = Math.sqrt(Math.max(variance, 1e-12));
  return Number.isFinite(std) && std > 0 ? Math.sqrt(ENGINE_CONFIG.tradingDays) * (mean / std) : 0;
}

function computeDailyReturns(points: EquityCurvePoint[], initialCapital: number): number[] {
  let prevEquity = initialCapital;
  const returns: number[] = [];

  for (const p of points) {
    const equity = initialCapital + p.combined;
    const dailyPnL = equity - prevEquity;
    const dailyReturn = prevEquity !== 0 ? dailyPnL / prevEquity : 0;
    returns.push(Number.isFinite(dailyReturn) ? dailyReturn : 0);
    prevEquity = equity;
  }

  return returns;
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

export async function buildStrategyComparison(
  input: StrategyComparisonInput,
): Promise<StrategyComparisonResult> {
  const db = await getDb();
  const useDb = Boolean(db);
  const trades = useDb ? await loadTrades(input.userId) : sampleTrades.filter(t => t.userId === input.userId);
  const strategies = useDb ? await loadStrategies(input.userId) : sampleStrategies.filter(s => s.userId === input.userId);

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
    const sharpeRatio = computeSharpeRatio(agg.tradeReturns);
    const winRatePct = agg.totalTrades > 0 ? (agg.wins / agg.totalTrades) * 100 : 0;
    const profitFactor = agg.grossLoss > 0 ? agg.grossProfit / agg.grossLoss : agg.grossProfit > 0 ? Infinity : 0;

    const totalReturn = agg.pnl;
    const totalReturnPct = agg.notional > 0 ? (agg.pnl / agg.notional) * 100 : 0;

    let maxDrawdown = 0;
    let peak = 0;
    let cum = 0;
    for (const ret of agg.tradeReturns) {
      cum += ret;
      peak = Math.max(peak, cum);
      maxDrawdown = Math.min(maxDrawdown, cum - peak);
    }

    comparisonRows.push({
      strategyId: agg.strategyId,
      name: agg.name,
      type: agg.type,
      totalReturn,
      totalReturnPct,
      maxDrawdown,
      maxDrawdownPct: peak > 0 ? (maxDrawdown / peak) * 100 : 0,
      sharpeRatio,
      winRatePct,
      totalTrades: agg.totalTrades,
      profitFactor,
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

export async function buildPortfolioSummary(userId: number): Promise<PortfolioSummary> {
  const curve = await buildAggregatedEquityCurve(userId, {});
  const comparison = await buildStrategyComparison({
    userId,
    page: 1,
    pageSize: 100,
    sortBy: "totalReturn",
    sortOrder: "desc",
    filterType: "all",
  });

  const returns = curve.points.map(p => p.combined);
  const max = returns.reduce((m, v) => Math.max(m, v), 0);
  const min = returns.reduce((m, v) => Math.min(m, v), 0);
  const maxDrawdownPct = max === 0 ? 0 : ((min - max) / max) * 100;
  const finalReturnPct = returns.length < 2 ? 0 : ((returns[returns.length - 1] - returns[0]) / 100000) * 100;
  const allTrades = comparison.rows.reduce((sum: number, r: StrategyComparisonRow) => sum + r.totalTrades, 0);
  const wins = comparison.rows.reduce(
    (sum: number, r: StrategyComparisonRow) => sum + (r.winRatePct / 100) * r.totalTrades,
    0,
  );
  const winRatePct = allTrades === 0 ? 0 : (wins / allTrades) * 100;

  const dailyReturns = computeDailyReturns(curve.points, ENGINE_CONFIG.initialCapital);
  const sharpeRatio = computeSharpeRatio(dailyReturns);

  return {
    totalReturnPct: finalReturnPct,
    maxDrawdownPct,
    sharpeRatio,
    winRatePct,
  };
}

export async function buildPortfolioOverview(userId: number): Promise<PortfolioOverview> {
  const [equityCurve, drawdowns, trades] = await Promise.all([
    buildAggregatedEquityCurve(userId, {}),
    buildDrawdownCurves(userId, {}),
    loadTrades(userId),
  ]);

  const initialCapital = ENGINE_CONFIG.initialCapital;
  const equityPoints = equityCurve.points;
  const drawdownPoints = drawdowns.points.length > 0 ? drawdowns.points : buildDrawdownSeries(equityPoints);
  const hasDailyReturns = equityPoints.length >= 2;

  const latestEquityPoint = equityPoints.at(-1);
  const previousEquityPoint = hasDailyReturns ? equityPoints[equityPoints.length - 2] : latestEquityPoint;

  const latestEquity = latestEquityPoint ? initialCapital + latestEquityPoint.combined : initialCapital;
  const previousEquity = previousEquityPoint ? initialCapital + previousEquityPoint.combined : latestEquity;

  const rawDailyPnL = hasDailyReturns ? latestEquity - previousEquity : 0;
  const rawDailyReturn = hasDailyReturns && previousEquity !== 0 ? latestEquity / previousEquity - 1 : 0;
  const rawTotalReturn = initialCapital !== 0 ? (latestEquity - initialCapital) / initialCapital : 0;

  const dailyPnL = Number.isFinite(rawDailyPnL) ? rawDailyPnL : 0;
  const dailyReturn = Number.isFinite(rawDailyReturn) ? rawDailyReturn : 0;
  const totalReturn = Number.isFinite(rawTotalReturn) ? rawTotalReturn : 0;

  const dailyReturns = hasDailyReturns ? computeDailyReturns(equityPoints, initialCapital) : [];
  const sharpeRatio = dailyReturns.length > 1 ? computeSharpeRatio(dailyReturns) : 0;

  const maxDrawdown = drawdownPoints.length
    ? drawdownPoints.reduce((m, p) => Math.min(m, p.combined), 0)
    : 0;
  const currentDrawdown = drawdownPoints.at(-1)?.combined ?? 0;

  let totalTrades = 0;
  let winningTrades = 0;
  let losingTrades = 0;
  let grossProfit = 0;
  let grossLoss = 0;

  for (const t of trades) {
    const pnl = tradePnl(t.side, Number(t.entryPrice), Number(t.exitPrice), Number(t.quantity));
    totalTrades += 1;
    if (pnl > 0) {
      winningTrades += 1;
      grossProfit += pnl;
    } else if (pnl < 0) {
      losingTrades += 1;
      grossLoss += Math.abs(pnl);
    }
  }

  const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
  const profitFactorRaw = grossLoss > 0 ? grossProfit / grossLoss : 0;
  const profitFactor = Number.isFinite(profitFactorRaw) ? profitFactorRaw : 0;

  return {
    equity: latestEquity,
    dailyPnL,
    dailyReturn,
    totalReturn,
    sharpeRatio,
    maxDrawdown,
    currentDrawdown,
    totalTrades,
    winningTrades,
    losingTrades,
    winRate,
    profitFactor,
    positions: 0,
    lastUpdated: new Date(),
  };
}

export async function generateTradesCsv(input: ExportTradesInput): Promise<string> {
  const trades = await loadTrades(input.userId);

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
}): Promise<MonteCarloResult> {
  const equity = await buildAggregatedEquityCurve(input.userId, {});
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

  const p10: number[] = [];
  const p50: number[] = [];
  const p90: number[] = [];

  for (let i = 0; i < input.days; i++) {
    const slice = simResults.map(path => path[i]).filter(v => v != null).sort((a, b) => a - b);
    const n = slice.length;
    if (n === 0) {
      p10.push(currentEquity);
      p50.push(currentEquity);
      p90.push(currentEquity);
      continue;
    }
    const idx10 = Math.floor(0.1 * (n - 1));
    const idx50 = Math.floor(0.5 * (n - 1));
    const idx90 = Math.floor(0.9 * (n - 1));

    p10.push(slice[idx10]);
    p50.push(slice[idx50]);
    p90.push(slice[idx90]);
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
    p10,
    p50,
    p90,
    currentEquity,
    finalEquities,
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
