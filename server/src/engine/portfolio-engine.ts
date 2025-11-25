import {
  DrawdownPoint,
  DrawdownResponse,
  EquityCurvePoint,
  EquityCurveResponse,
  PortfolioSummary,
  StrategyComparisonResult,
  StrategyComparisonRow,
  StrategySummary,
  StrategyType,
  TradeRow,
} from "@shared/types/portfolio";
import { eq } from "drizzle-orm";
import { benchmarks as sampleBenchmarks, strategies as sampleStrategies, trades as sampleTrades } from "../db/sampleData";
import { getDb, schema } from "../db";

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

function tradePnl(side: string, entry: number, exit: number, qty: number): number {
  const normalizedSide = side.toLowerCase();
  if (normalizedSide === "short" || normalizedSide === "sell") {
    return (entry - exit) * qty;
  }
  return (exit - entry) * qty;
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
    return db
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
  }
  return sampleTrades.filter(t => t.userId === userId);
}

async function loadBenchmarks() {
  const db = await getDb();
  if (db) {
    return db.select({ date: schema.benchmarks.date, close: schema.benchmarks.close }).from(schema.benchmarks);
  }
  return sampleBenchmarks;
}

export async function buildAggregatedEquityCurve(
  userId: number,
  opts: EquityCurveOptions = {}
): Promise<EquityCurveResponse> {
  const { startDate, endDate, maxPoints } = opts;
  const [strategies, trades, benchmarkRows] = await Promise.all([
    loadStrategies(userId),
    loadTrades(userId),
    loadBenchmarks(),
  ]);

  const typeByStrategy = new Map<number, StrategyType>();
  for (const s of strategies) typeByStrategy.set(s.id, s.type);

  const dateSet = new Set<string>();

  type DailyBucket = { swing: number; intraday: number; combined: number };
  const pnlByDate = new Map<string, DailyBucket>();

  for (const trade of trades) {
    const exit = new Date(trade.exitTime);
    const isoDate = exit.toISOString().slice(0, 10);
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
    const benchmark = benchmarkRows.find((b: any) => b.date === d);
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
    const step = Math.ceil(points.length / maxPoints);
    return { points: points.filter((_, idx) => idx % step === 0) };
  }

  return { points };
}

export async function buildDrawdownCurves(userId: number, opts: EquityCurveOptions = {}): Promise<DrawdownResponse> {
  const equity = await buildAggregatedEquityCurve(userId, opts);
  let peakCombined = Number.NEGATIVE_INFINITY;
  let peakSwing = Number.NEGATIVE_INFINITY;
  let peakIntraday = Number.NEGATIVE_INFINITY;
  let peakSpx = Number.NEGATIVE_INFINITY;

  const points: DrawdownPoint[] = [];
  for (const point of equity.points) {
    peakCombined = Math.max(peakCombined, point.combined);
    peakSwing = Math.max(peakSwing, point.swing);
    peakIntraday = Math.max(peakIntraday, point.intraday);
    peakSpx = Math.max(peakSpx, point.spx);

    points.push({
      date: point.date,
      combined: point.combined - peakCombined,
      swing: point.swing - peakSwing,
      intraday: point.intraday - peakIntraday,
      spx: point.spx - peakSpx,
    });
  }

  return { points };
}

export async function buildStrategyComparison(input: StrategyComparisonInput): Promise<StrategyComparisonResult> {
  const trades = await loadTrades(input.userId);
  const strategies = await loadStrategies(input.userId);
  const typeByStrategy = new Map<number, StrategyType>();
  const nameByStrategy = new Map<number, string>();
  for (const s of strategies) {
    typeByStrategy.set(s.id, s.type);
    nameByStrategy.set(s.id, s.name);
  }

  type Agg = {
    equity: number[];
    cumulative: number;
    maxDrawdown: number;
    returns: number[];
    wins: number;
    losses: number;
    grossProfit: number;
    grossLoss: number;
    notional: number;
  };

  const aggregated = new Map<number, Agg>();

  const sortedTrades = [...trades].sort((a, b) => a.exitTime.localeCompare(b.exitTime));
  for (const trade of sortedTrades) {
    const pnl = tradePnl(trade.side, Number(trade.entryPrice), Number(trade.exitPrice), Number(trade.quantity));
    const notional = Math.abs(Number(trade.entryPrice) * Number(trade.quantity));
    const agg = aggregated.get(trade.strategyId) ?? {
      equity: [],
      cumulative: 0,
      maxDrawdown: 0,
      returns: [],
      wins: 0,
      losses: 0,
      grossProfit: 0,
      grossLoss: 0,
      notional: 0,
    };

    agg.cumulative += pnl;
    agg.notional += notional;
    agg.equity.push(agg.cumulative);
    agg.maxDrawdown = Math.min(agg.maxDrawdown, agg.cumulative - Math.max(...agg.equity));
    agg.returns.push(notional === 0 ? 0 : pnl / notional);
    if (pnl >= 0) {
      agg.wins += 1;
      agg.grossProfit += pnl;
    } else {
      agg.losses += 1;
      agg.grossLoss += pnl;
    }

    aggregated.set(trade.strategyId, agg);
  }

  const rows: StrategyComparisonRow[] = [];
  aggregated.forEach((agg, strategyId) => {
    const equityPeak = agg.equity.reduce((max, v) => Math.max(max, v), 0);
    const mdd = equityPeak === 0 ? 0 : agg.equity.reduce((m, v) => Math.min(m, v - equityPeak), 0);
    const totalTrades = agg.wins + agg.losses;
    const winRatePct = totalTrades === 0 ? 0 : (agg.wins / totalTrades) * 100;
    const sharpeRatio = agg.returns.length === 0 ? 0 : (agg.returns.reduce((a, b) => a + b, 0) / agg.returns.length) / 0.02;
    const profitFactor = agg.grossLoss === 0 ? agg.grossProfit : agg.grossProfit / Math.abs(agg.grossLoss);

    rows.push({
      strategyId,
      name: nameByStrategy.get(strategyId) ?? `Strategy ${strategyId}`,
      type: typeByStrategy.get(strategyId) ?? "swing",
      totalReturn: agg.cumulative,
      totalReturnPct: agg.notional === 0 ? 0 : (agg.cumulative / agg.notional) * 100,
      maxDrawdown: mdd,
      maxDrawdownPct: equityPeak === 0 ? 0 : (mdd / equityPeak) * 100,
      sharpeRatio,
      winRatePct,
      totalTrades,
      profitFactor,
    });
  });

  let filtered = rows;
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
  const allTrades = comparison.rows.reduce((sum, r) => sum + r.totalTrades, 0);
  const wins = comparison.rows.reduce((sum, r) => sum + (r.winRatePct / 100) * r.totalTrades, 0);
  const winRatePct = allTrades === 0 ? 0 : (wins / allTrades) * 100;

  return {
    totalReturnPct: finalReturnPct,
    maxDrawdownPct,
    sharpeRatio: comparison.rows.length === 0 ? 0 : comparison.rows[0].sharpeRatio,
    winRatePct,
  };
}
