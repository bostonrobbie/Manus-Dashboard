
import { and, between, eq, gte, lte } from "drizzle-orm";
import { getDb } from "./db";
import { trades, strategies, benchmarks } from "../drizzle/schema";

// ----------------------------------------------------------
//  Shared Types
// ----------------------------------------------------------

export interface StrategyDailyRow {
  date: string; // ISO YYYY-MM-DD
  strategyId: number;
  strategyName: string;
  strategyType: "swing" | "intraday";
  dailyPnl: number;
}

export interface BenchmarkDailyRow {
  date: string;
  close: number;
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
  startDate?: string;
  endDate?: string;
  maxPoints?: number;
}

// Drawdown types
export interface DrawdownPoint {
  date: string;
  combined: number; // <= 0
  swing: number;
  intraday: number;
  spx: number;
}

export interface DrawdownCurvesResult {
  points: DrawdownPoint[];
}

// Strategy comparison types
export interface StrategyComparisonInput {
  page: number;
  pageSize: number;
  sortBy: string;
  sortOrder: "asc" | "desc";
  filterType: "all" | "swing" | "intraday";
  search?: string;
  userId: number;
}

export interface StrategyComparisonRow {
  strategyId: number;
  name: string;
  type: "swing" | "intraday";
  totalReturn: number;
  totalReturnPct: number;
  maxDrawdown: number;
  maxDrawdownPct: number;
  sharpeRatio: number;
  winRatePct: number;
  totalTrades: number;
  profitFactor: number;
}

// CSV export types
export interface ExportTradesInput {
  userId: number;
  strategyIds?: number[];
  startDate?: string;
  endDate?: string;
}

export interface MonteCarloInput {
  userId: number;
  strategyIds?: number[];
  days: number;
  simulations: number;
}

// Monte Carlo types
export interface MonteCarloResult {
  futureDates: string[];
  p10: number[];
  p50: number[];
  p90: number[];
  currentEquity: number;
  finalEquities: number[];
}

// ----------------------------------------------------------
//  Equity Curves
// ----------------------------------------------------------

export async function buildAggregatedEquityCurve(
  userId: number,
  opts: EquityCurveOptions = {}
): Promise<MultiCurveResult> {
  if (!Number.isFinite(userId)) {
    throw new Error("buildAggregatedEquityCurve: invalid userId");
  }

  const { startDate, endDate, maxPoints } = opts;

  try {
    const [strategyRows, benchmarkRows] = await Promise.all([
      loadStrategyDailyRowsFromDb(userId, startDate, endDate),
      loadBenchmarkDailyRowsFromDb(startDate, endDate),
    ]);

    if (strategyRows.length === 0 && benchmarkRows.length === 0) {
      return { points: [] };
    }

    const dateSet = new Set<string>();
    for (const row of strategyRows) dateSet.add(row.date);
    for (const row of benchmarkRows) dateSet.add(row.date);
    const allDates = Array.from(dateSet).sort((a, b) =>
      a === b ? 0 : a < b ? -1 : 1
    );

    const dailyPnlByDate = new Map<
      string,
      { swing: number; intraday: number; combined: number }
    >();
    for (const d of allDates) {
      dailyPnlByDate.set(d, { swing: 0, intraday: 0, combined: 0 });
    }

    for (const row of strategyRows) {
      const record = dailyPnlByDate.get(row.date);
      if (!record) continue;

      if (row.strategyType === "swing") {
        record.swing += row.dailyPnl;
      } else {
        record.intraday += row.dailyPnl;
      }
      record.combined += row.dailyPnl;
    }

    const spxCloseByDate = new Map<string, number>();
    for (const row of benchmarkRows) {
      spxCloseByDate.set(row.date, row.close);
    }

    const points: MultiCurvePoint[] = [];
    let cumCombined = 0;
    let cumSwing = 0;
    let cumIntraday = 0;
    let firstSpxClose: number | null = null;
    let lastSpxEquity = 0;

    for (const d of allDates) {
      const pnlRow = dailyPnlByDate.get(d)!;

      cumSwing += pnlRow.swing;
      cumIntraday += pnlRow.intraday;
      cumCombined += pnlRow.combined;

      const spxClose = spxCloseByDate.get(d);
      if (spxClose != null) {
        if (firstSpxClose == null) firstSpxClose = spxClose;
        lastSpxEquity = spxClose - (firstSpxClose ?? spxClose);
      }

      points.push({
        date: d,
        combined: cumCombined,
        swing: cumSwing,
        intraday: cumIntraday,
        spx: lastSpxEquity,
      });
    }

    // Normalize to start at 0
    if (points.length > 0) {
      const base = points[0];
      for (const p of points) {
        p.combined -= base.combined;
        p.swing -= base.swing;
        p.intraday -= base.intraday;
        p.spx -= base.spx;
      }
    }

    const finalPoints =
      typeof maxPoints === "number" && maxPoints > 0
        ? downsamplePoints(points, maxPoints)
        : points;

    return { points: finalPoints };
  } catch (err) {
    console.error("buildAggregatedEquityCurve error:", err);
    throw new Error("Failed to build aggregated equity curve");
  }
}

// ----------------------------------------------------------
//  Drawdown Curves
// ----------------------------------------------------------

export async function buildDrawdownCurves(
  userId: number,
  opts: EquityCurveOptions = {}
): Promise<DrawdownCurvesResult> {
  const equity = await buildAggregatedEquityCurve(userId, opts);
  const pts = equity.points;
  if (pts.length === 0) return { points: [] };

  let peakCombined = pts[0].combined;
  let peakSwing = pts[0].swing;
  let peakIntraday = pts[0].intraday;
  let peakSpx = pts[0].spx;

  const ddPoints: DrawdownPoint[] = [];

  for (const p of pts) {
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

  return { points: ddPoints };
}

// ----------------------------------------------------------
//  Strategy Comparison
// ----------------------------------------------------------

export async function buildStrategyComparison(
  input: StrategyComparisonInput
): Promise<{ rows: StrategyComparisonRow[]; total: number }> {
  const {
    userId,
    page,
    pageSize,
    sortBy,
    sortOrder,
    filterType,
    search,
  } = input;

  // Load all trades joined with strategies for this user
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const rows = await db
    .select({
      strategyId: trades.strategyId,
      entryPrice: trades.entryPrice,
      exitPrice: trades.exitPrice,
      quantity: trades.quantity,
      side: trades.side,
      exitTime: trades.exitTime,
      strategyName: strategies.name,
      strategyType: strategies.type,
    })
    .from(trades)
    .innerJoin(strategies, eq(trades.strategyId, strategies.id))
    .where(eq(trades.userId, userId));

  // Aggregate per strategy
  type Agg = {
    strategyId: number;
    name: string;
    type: "swing" | "intraday";
    pnl: number;
    notionalSum: number;
    equitySeries: number[];
    dailyEquityByDate: Map<string, number>;
    tradeReturns: number[];
    wins: number;
    losses: number;
    grossProfit: number;
    grossLoss: number;
    totalTrades: number;
  };

  const map = new Map<number, Agg>();

  for (const row of rows) {
    const sid = row.strategyId as number;
    let agg = map.get(sid);
    if (!agg) {
      agg = {
        strategyId: sid,
        name: row.strategyName ?? `Strategy ${sid}`,
        type: (row.strategyType as "swing" | "intraday") ?? "swing",
        pnl: 0,
        notionalSum: 0,
        equitySeries: [],
        dailyEquityByDate: new Map(),
        tradeReturns: [],
        wins: 0,
        losses: 0,
        grossProfit: 0,
        grossLoss: 0,
        totalTrades: 0,
      };
      map.set(sid, agg);
    }

    const side = String(row.side).toLowerCase();
    const qty = Number(row.quantity) || 0;
    const entry = Number(row.entryPrice) || 0;
    const exit = Number(row.exitPrice) || 0;
    if (!Number.isFinite(qty) || !Number.isFinite(entry) || !Number.isFinite(exit)) {
      continue;
    }

    let pnl = 0;
    if (side === "long" || side === "buy") {
      pnl = (exit - entry) * qty;
    } else if (side === "short" || side === "sell") {
      pnl = (entry - exit) * qty;
    }

    const notional = Math.abs(entry * qty);
    const retPct = notional > 0 ? pnl / notional : 0;

    agg.pnl += pnl;
    agg.notionalSum += notional;
    agg.tradeReturns.push(retPct);
    agg.totalTrades += 1;
    if (pnl > 0) {
      agg.wins += 1;
      agg.grossProfit += pnl;
    } else if (pnl < 0) {
      agg.losses += 1;
      agg.grossLoss += Math.abs(pnl);
    }

    // Daily equity per strategy (simple cum-PnL by date)
    if (row.exitTime) {
      const dateKey = normalizeToDateKey(row.exitTime as Date);
      const prev = agg.dailyEquityByDate.get(dateKey) ?? 0;
      agg.dailyEquityByDate.set(dateKey, prev + pnl);
    }
  }

  const comparisonRows: StrategyComparisonRow[] = [];

  for (const agg of map.values()) {
    // Build equity series sorted by date for max drawdown
    const dates = Array.from(agg.dailyEquityByDate.keys()).sort();
    let cum = 0;
    let peak = 0;
    let maxDD = 0;

    for (const d of dates) {
      cum += agg.dailyEquityByDate.get(d)!;
      peak = Math.max(peak, cum);
      const dd = cum - peak;
      maxDD = Math.min(maxDD, dd);
    }

    const totalReturn = agg.pnl;
    const totalReturnPct = agg.notionalSum > 0 ? agg.pnl / agg.notionalSum : 0;
    const maxDrawdown = maxDD;
    const maxDrawdownPct = peak > 0 ? maxDD / peak : 0;

    // Sharpe from per-trade returns (approx)
    let sharpe = 0;
    if (agg.tradeReturns.length > 1) {
      const mean =
        agg.tradeReturns.reduce((a, b) => a + b, 0) / agg.tradeReturns.length;
      const variance =
        agg.tradeReturns.reduce((a, b) => a + (b - mean) * (b - mean), 0) /
        (agg.tradeReturns.length - 1);
      const std = Math.sqrt(variance);
      if (std > 0) {
        sharpe = Math.sqrt(252) * (mean / std);
      }
    }

    const winRatePct =
      agg.totalTrades > 0 ? (agg.wins / agg.totalTrades) * 100 : 0;
    const profitFactor =
      agg.grossLoss > 0 ? agg.grossProfit / agg.grossLoss : agg.grossProfit > 0 ? Infinity : 0;

    comparisonRows.push({
      strategyId: agg.strategyId,
      name: agg.name,
      type: agg.type,
      totalReturn,
      totalReturnPct: totalReturnPct * 100,
      maxDrawdown,
      maxDrawdownPct: maxDrawdownPct * 100,
      sharpeRatio: sharpe,
      winRatePct,
      totalTrades: agg.totalTrades,
      profitFactor,
    });
  }

  // Filter
  let filtered = comparisonRows;
  if (filterType !== "all") {
    filtered = filtered.filter((r) => r.type === filterType);
  }
  if (search && search.trim()) {
    const q = search.trim().toLowerCase();
    filtered = filtered.filter((r) => r.name.toLowerCase().includes(q));
  }

  // Sort
  filtered.sort((a, b) => {
    const dir = sortOrder === "asc" ? 1 : -1;
    const getVal = (r: StrategyComparisonRow): number | string => {
      switch (sortBy) {
        case "name":
          return r.name;
        case "type":
          return r.type;
        case "maxDrawdown":
          return r.maxDrawdown;
        case "maxDrawdownPct":
          return r.maxDrawdownPct;
        case "sharpeRatio":
          return r.sharpeRatio;
        case "winRatePct":
          return r.winRatePct;
        case "totalTrades":
          return r.totalTrades;
        case "profitFactor":
          return r.profitFactor;
        case "totalReturnPct":
          return r.totalReturnPct;
        case "totalReturn":
        default:
          return r.totalReturn;
      }
    };
    const va = getVal(a);
    const vb = getVal(b);

    if (typeof va === "string" && typeof vb === "string") {
      return va < vb ? -dir : va > vb ? dir : 0;
    }
    const na = Number(va);
    const nb = Number(vb);
    if (na < nb) return -dir;
    if (na > nb) return dir;
    return 0;
  });

  const total = filtered.length;
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;

  const pageRows = filtered.slice(startIndex, endIndex);

  return { rows: pageRows, total };
}

// ----------------------------------------------------------
//  CSV Export
// ----------------------------------------------------------

export async function generateTradesCsv(
  input: ExportTradesInput
): Promise<string> {
  const { userId, strategyIds, startDate, endDate } = input;

  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const predicates: any[] = [eq(trades.userId, userId)];

  if (strategyIds && strategyIds.length > 0) {
    // simple "IN" workaround: or / eq chain usually; adjust to your Drizzle version.
    predicates.push(trades.strategyId.in(strategyIds));
  }

  if (startDate && endDate) {
    predicates.push(
      between(
        trades.exitTime,
        new Date(startDate + "T00:00:00.000Z"),
        new Date(endDate + "T23:59:59.999Z")
      )
    );
  } else if (startDate) {
    predicates.push(
      gte(trades.exitTime, new Date(startDate + "T00:00:00.000Z"))
    );
  } else if (endDate) {
    predicates.push(
      lte(trades.exitTime, new Date(endDate + "T23:59:59.999Z"))
    );
  }

  const rows = await db
    .select({
      entryTime: trades.entryTime,
      exitTime: trades.exitTime,
      strategyName: strategies.name,
      symbol: trades.symbol,
      side: trades.side,
      entryPrice: trades.entryPrice,
      exitPrice: trades.exitPrice,
      quantity: trades.quantity,
    })
    .from(trades)
    .innerJoin(strategies, eq(trades.strategyId, strategies.id))
    .where(and(...predicates));

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

  for (const r of rows) {
    if (!r.entryTime || !r.exitTime) continue;

    const entry = r.entryTime as Date;
    const exit = r.exitTime as Date;

    const dateStr = normalizeToDateKey(exit);
    const qty = Number(r.quantity) || 0;
    const entryPrice = Number(r.entryPrice) || 0;
    const exitPrice = Number(r.exitPrice) || 0;
    const side = String(r.side).toLowerCase();

    let pnl = 0;
    if (side === "long" || side === "buy") {
      pnl = (exitPrice - entryPrice) * qty;
    } else if (side === "short" || side === "sell") {
      pnl = (entryPrice - exitPrice) * qty;
    }

    const notional = Math.abs(entryPrice * qty);
    const retPct = notional > 0 ? (pnl / notional) * 100 : 0;

    const msDiff = exit.getTime() - entry.getTime();
    const holdingDays = msDiff / (1000 * 60 * 60 * 24);

    const rowArr = [
      dateStr,
      r.strategyName ?? "",
      r.symbol ?? "",
      r.side ?? "",
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

// ----------------------------------------------------------
//  Monte Carlo Simulation
// ----------------------------------------------------------

export async function runMonteCarloSimulation(
  input: MonteCarloInput
): Promise<MonteCarloResult> {
  const { userId, days, simulations } = input;

  const equity = await buildAggregatedEquityCurve(userId, {});
  const pts = equity.points;
  if (pts.length < 2) {
    throw new Error("Not enough history for Monte Carlo simulation");
  }

  // Use combined curve
  const equities = pts.map((p) => p.combined);
  const dailyReturns: number[] = [];

  for (let i = 1; i < equities.length; i++) {
    const prev = equities[i - 1];
    const curr = equities[i];
    const ret = prev !== 0 ? (curr - prev) / Math.abs(prev) : 0;
    dailyReturns.push(ret);
  }

  const mean =
    dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length;
  const variance =
    dailyReturns.reduce((a, b) => a + (b - mean) * (b - mean), 0) /
    (dailyReturns.length - 1);
  const std = Math.sqrt(Math.max(variance, 1e-12));

  const currentEquity = equities[equities.length - 1];
  const simResults: number[][] = [];
  const finalEquities: number[] = [];

  for (let s = 0; s < simulations; s++) {
    let eq = currentEquity;
    const path: number[] = [];
    for (let d = 0; d < days; d++) {
      const r = randomNormal(mean, std);
      eq = eq * (1 + r); // multiplicative
      path.push(eq);
    }
    simResults.push(path);
    finalEquities.push(path[path.length - 1]);
  }

  // Percentiles for each day
  const p10: number[] = [];
  const p50: number[] = [];
  const p90: number[] = [];

  for (let i = 0; i < days; i++) {
    const slice = simResults.map((path) => path[i]).sort((a, b) => a - b);
    const n = slice.length;
    const idx10 = Math.floor(0.1 * (n - 1));
    const idx50 = Math.floor(0.5 * (n - 1));
    const idx90 = Math.floor(0.9 * (n - 1));

    p10.push(slice[idx10]);
    p50.push(slice[idx50]);
    p90.push(slice[idx90]);
  }

  // Future dates: just extend last known date as +1, +2, ... days
  const lastDateStr = pts[pts.length - 1].date;
  const lastDate = new Date(lastDateStr + "T00:00:00.000Z");
  const futureDates: string[] = [];
  for (let i = 1; i <= days; i++) {
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
  // Box-Muller
  let u = 0,
    v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  return mean + std * z;
}

// ----------------------------------------------------------
//  DB Helpers
// ----------------------------------------------------------

export async function loadStrategyDailyRowsFromDb(
  userId: number,
  startDate?: string,
  endDate?: string
): Promise<StrategyDailyRow[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const predicates: any[] = [eq(trades.userId, userId)];

  if (startDate && endDate) {
    predicates.push(
      between(
        trades.exitTime,
        new Date(startDate + "T00:00:00.000Z"),
        new Date(endDate + "T23:59:59.999Z")
      )
    );
  } else if (startDate) {
    predicates.push(
      gte(trades.exitTime, new Date(startDate + "T00:00:00.000Z"))
    );
  } else if (endDate) {
    predicates.push(
      lte(trades.exitTime, new Date(endDate + "T23:59:59.999Z"))
    );
  }

  const rows = await db
    .select({
      strategyId: trades.strategyId,
      entryPrice: trades.entryPrice,
      exitPrice: trades.exitPrice,
      quantity: trades.quantity,
      side: trades.side,
      exitTime: trades.exitTime,
      strategyName: strategies.name,
      strategyType: strategies.type,
    })
    .from(trades)
    .innerJoin(strategies, eq(trades.strategyId, strategies.id))
    .where(and(...predicates));

  const map = new Map<string, StrategyDailyRow>();

  for (const row of rows) {
    if (!row.exitTime) continue;

    const dateKey = normalizeToDateKey(row.exitTime as Date);
    const side = String(row.side).toLowerCase();
    const qty = Number(row.quantity) || 0;
    const entry = Number(row.entryPrice) || 0;
    const exit = Number(row.exitPrice) || 0;

    if (!Number.isFinite(qty) || !Number.isFinite(entry) || !Number.isFinite(exit)) {
      continue;
    }

    let pnl = 0;
    if (side === "long" || side === "buy") {
      pnl = (exit - entry) * qty;
    } else if (side === "short" || side === "sell") {
      pnl = (entry - exit) * qty;
    } else {
      continue;
    }

    const key = `${dateKey}::${row.strategyId}`;
    const existing = map.get(key);

    if (existing) {
      existing.dailyPnl += pnl;
    } else {
      const type = (row.strategyType as "swing" | "intraday") ?? "swing";

      map.set(key, {
        date: dateKey,
        strategyId: row.strategyId as number,
        strategyName: row.strategyName ?? `Strategy ${row.strategyId}`,
        strategyType: type,
        dailyPnl: pnl,
      });
    }
  }

  return Array.from(map.values()).sort((a, b) =>
    a.date === b.date
      ? a.strategyId - b.strategyId
      : a.date < b.date
      ? -1
      : 1
  );
}

export async function loadBenchmarkDailyRowsFromDb(
  startDate?: string,
  endDate?: string,
  symbol: string = "SPX"
): Promise<BenchmarkDailyRow[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const predicates: any[] = [eq(benchmarks.symbol, symbol)];

  if (startDate && endDate) {
    predicates.push(
      between(
        benchmarks.date,
        new Date(startDate + "T00:00:00.000Z"),
        new Date(endDate + "T23:59:59.999Z")
      )
    );
  } else if (startDate) {
    predicates.push(
      gte(benchmarks.date, new Date(startDate + "T00:00:00.000Z"))
    );
  } else if (endDate) {
    predicates.push(
      lte(benchmarks.date, new Date(endDate + "T23:59:59.999Z"))
    );
  }

  const rows = await db
    .select({
      date: benchmarks.date,
      close: benchmarks.close,
    })
    .from(benchmarks)
    .where(and(...predicates));

  return rows
    .map((r) => ({
      date: normalizeToDateKey(r.date as Date),
      close: Number(r.close) || 0,
    }))
    .sort((a, b) => (a.date === b.date ? 0 : a.date < b.date ? -1 : 1));
}

// ----------------------------------------------------------
//  Utility Helpers
// ----------------------------------------------------------

export function normalizeToDateKey(date: Date): string {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();

  const mm = month < 10 ? `0${month}` : String(month);
  const dd = day < 10 ? `0${day}` : String(day);

  return `${year}-${mm}-${dd}`;
}

/**
 * LTTB downsampling
 * - Generic on T extends { date: string }
 * - Always keeps first & last
 * - Uses `combined` as y if present, otherwise index
 */
export function downsamplePoints<T extends { date: string }>(
  points: T[],
  maxPoints: number
): T[] {
  const n = points.length;
  if (!Array.isArray(points) || n === 0 || maxPoints <= 0) return [];
  if (n <= maxPoints) return points;

  const sampled: T[] = [];
  const buckets = maxPoints - 2;
  const bucketSize = (n - 2) / buckets;

  let a = 0;
  sampled.push(points[a]); // first

  for (let i = 0; i < buckets; i++) {
    const bucketStart = Math.floor(1 + i * bucketSize);
    const bucketEnd = Math.floor(1 + (i + 1) * bucketSize);
    const bucketEndClamped = Math.min(bucketEnd, n - 1);

    const rangeStart = bucketStart;
    const rangeEnd = bucketEndClamped;

    if (rangeStart >= rangeEnd) continue;

    const nextBucketStart = bucketEndClamped;
    const nextBucketEnd = Math.min(
      Math.floor(1 + (i + 2) * bucketSize),
      n
    );

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
      const area = Math.abs(
        (ax - avgX) * (py - ay) - (ax - px) * (avgY - ay)
      );
      if (area > maxArea) {
        maxArea = area;
        chosenIndex = j;
      }
    }

    sampled.push(points[chosenIndex]);
    a = chosenIndex;
  }

  sampled.push(points[n - 1]); // last

  sampled.sort((a, b) => {
    const idxA = indexOf(points, a);
    const idxB = indexOf(points, b);
    return idxA - idxB;
  });

  return sampled;

  function getY(p: any): number {
    if (typeof p.combined === "number" && Number.isFinite(p.combined)) {
      return p.combined;
    }
    return 0;
  }

  function indexOf(arr: T[], item: T): number {
    const idx = arr.indexOf(item);
    return idx === -1 ? 0 : idx;
  }
}

