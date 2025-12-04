import { computeReturnMetrics, computeTradeMetrics, safeNumber } from "@server/engine/metrics";

export type PortfolioContractTimeRange = "YTD" | "1Y" | "3Y" | "5Y" | "ALL";

const PERIODS_PER_YEAR = 252;

const toIsoDate = (date: Date) => date.toISOString().slice(0, 10);

export function deriveRangeFromContractTimeRange(preset: PortfolioContractTimeRange): {
  startDate?: string;
  endDate: string;
} {
  const today = new Date();
  const endDate = toIsoDate(today);

  if (preset === "ALL") {
    return { endDate };
  }

  const start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  switch (preset) {
    case "YTD":
      start.setUTCMonth(0, 1);
      break;
    case "1Y":
      start.setUTCFullYear(start.getUTCFullYear() - 1);
      break;
    case "3Y":
      start.setUTCFullYear(start.getUTCFullYear() - 3);
      break;
    case "5Y":
      start.setUTCFullYear(start.getUTCFullYear() - 5);
      break;
    default:
      break;
  }

  const startDate = toIsoDate(start);
  return { startDate, endDate };
}

export interface EquityPoint {
  date: string;
  equity: number;
}

export interface MetricInput {
  equityCurve: EquityPoint[];
  trades?: { pnl: number; initialRisk?: number | null; holdingPeriodDays?: number }[];
}

export interface MetricResult {
  totalReturn: number;
  annualizedReturn: number;
  volatility: number;
  sharpe: number;
  sortino: number;
  calmar: number;
  maxDrawdown: number;
  maxDrawdownPct: number;
  totalReturnPct: number;
  winRate: number;
  winRatePct: number;
  lossRatePct: number;
  profitFactor: number;
  payoffRatio: number;
  totalTrades: number;
  avgWin: number;
  avgLoss: number;
  expectancyPerTrade: number;
  avgHoldingPeriod?: number;
  alpha?: number | null;
}

export function buildDrawdownCurve(curve: EquityPoint[]): EquityPoint[] {
  let peak = curve.length ? curve[0].equity : 0;
  return curve.map(point => {
    peak = Math.max(peak, point.equity);
    const drawdown = peak > 0 ? ((point.equity - peak) / peak) * 100 : 0;
    return { date: point.date, equity: safeNumber(drawdown) };
  });
}

export function computeDailyReturnSeries(curve: EquityPoint[]): number[] {
  if (curve.length === 0) return [];
  let prev = curve[0].equity;
  const returns: number[] = [];
  for (let i = 1; i < curve.length; i++) {
    const current = curve[i].equity;
    const dailyReturn = prev !== 0 ? (current - prev) / prev : 0;
    returns.push(safeNumber(dailyReturn));
    prev = current;
  }
  return returns;
}

export function computeMetricBundle(input: MetricInput): MetricResult {
  const { equityCurve, trades = [] } = input;
  const returns = computeDailyReturnSeries(equityCurve);
  const returnMetrics = computeReturnMetrics(returns, { periodsPerYear: PERIODS_PER_YEAR });
  const tradeMetrics = computeTradeMetrics(trades);

  const startEquity = equityCurve.at(0)?.equity ?? 0;
  const endEquity = equityCurve.at(-1)?.equity ?? startEquity;
  const totalReturn = startEquity > 0 ? ((endEquity - startEquity) / startEquity) * 100 : 0;

  const holdingPeriods = trades
    .map(t => t.holdingPeriodDays)
    .filter((v): v is number => Number.isFinite(v));
  const avgHoldingPeriod = holdingPeriods.length
    ? holdingPeriods.reduce((sum, v) => sum + v, 0) / holdingPeriods.length
    : undefined;

  return {
    totalReturn: safeNumber(totalReturn),
    annualizedReturn: safeNumber(returnMetrics.cagr * 100),
    volatility: safeNumber(returnMetrics.volatility * 100),
    sharpe: safeNumber(returnMetrics.sharpe),
    sortino: safeNumber(returnMetrics.sortino),
    calmar: safeNumber(returnMetrics.calmar),
    maxDrawdown: safeNumber(returnMetrics.maxDrawdown.maxDrawdown * 100),
    maxDrawdownPct: safeNumber(returnMetrics.maxDrawdown.maxDrawdown * 100),
    totalReturnPct: safeNumber(totalReturn),
    winRate: safeNumber(tradeMetrics.winRate * 100),
    winRatePct: safeNumber(tradeMetrics.winRate * 100),
    lossRatePct: safeNumber(tradeMetrics.lossRate * 100),
    profitFactor: safeNumber(tradeMetrics.profitFactor),
    payoffRatio: safeNumber(tradeMetrics.payoffRatio),
    totalTrades: trades.length,
    avgWin: safeNumber(tradeMetrics.avgWin),
    avgLoss: safeNumber(tradeMetrics.avgLoss),
    expectancyPerTrade: safeNumber(tradeMetrics.expectancyPerTrade),
    avgHoldingPeriod,
    alpha: 0,
  };
}

export interface BreakdownResult<T = number> {
  daily: T;
  weekly: T;
  monthly: T;
  quarterly: T;
  ytd: T;
}

function computeReturnFromRange(curve: EquityPoint[], startDate: string | null): number {
  if (!curve.length) return 0;
  const end = curve[curve.length - 1];
  const start = startDate ? findEquityOnOrBefore(curve, startDate) : curve[0];
  if (!start || start.equity === 0) return 0;
  return safeNumber(((end.equity - start.equity) / start.equity) * 100);
}

function findEquityOnOrBefore(curve: EquityPoint[], targetDate: string): EquityPoint | null {
  for (let i = curve.length - 1; i >= 0; i--) {
    const point = curve[i];
    if (point.date <= targetDate) return point;
  }
  return null;
}

function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

export function computeBreakdown(curve: EquityPoint[]): BreakdownResult<number> {
  if (!curve.length) {
    return { daily: 0, weekly: 0, monthly: 0, quarterly: 0, ytd: 0 };
  }
  const latestDate = new Date(curve[curve.length - 1].date);
  const dailyStart = toIsoDate(addDays(latestDate, -1));
  const weeklyStart = toIsoDate(addDays(latestDate, -7));
  const monthlyStart = toIsoDate(addDays(latestDate, -30));
  const quarterlyStart = toIsoDate(addDays(latestDate, -90));
  const ytdStart = `${latestDate.getUTCFullYear()}-01-01`;

  return {
    daily: computeReturnFromRange(curve, dailyStart),
    weekly: computeReturnFromRange(curve, weeklyStart),
    monthly: computeReturnFromRange(curve, monthlyStart),
    quarterly: computeReturnFromRange(curve, quarterlyStart),
    ytd: computeReturnFromRange(curve, ytdStart),
  };
}

export function buildDateIndex(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  let current = new Date(startDate);
  const end = new Date(endDate);
  while (current <= end) {
    dates.push(toIsoDate(current));
    current = addDays(current, 1);
  }
  return dates;
}

export function forwardFillEquity(curve: EquityPoint[], dateIndex: string[], startingCapital: number): EquityPoint[] {
  const equityByDate = new Map(curve.map(point => [point.date, point.equity]));
  let last = startingCapital;
  return dateIndex.map(date => {
    const equity = equityByDate.has(date) ? Number(equityByDate.get(date)) : last;
    last = equity;
    return { date, equity: safeNumber(equity) };
  });
}

export function buildCorrelationMatrix(series: Record<number, number[]>, order?: number[]): number[][] {
  const ids = (order ?? Object.keys(series).map(Number)).map(Number);
  const size = ids.length;
  const matrix: number[][] = Array.from({ length: size }, () => Array(size).fill(1));

  for (let i = 0; i < size; i++) {
    for (let j = i; j < size; j++) {
      const arrA = series[Number(ids[i])] ?? [];
      const arrB = series[Number(ids[j])] ?? [];
      const corr = calculateCorrelation(arrA, arrB);
      matrix[i][j] = corr;
      matrix[j][i] = corr;
    }
  }

  return matrix;
}

function calculateCorrelation(a: number[], b: number[]): number {
  if (!a.length || !b.length || a.length !== b.length) return 0;
  const meanA = a.reduce((s, v) => s + v, 0) / a.length;
  const meanB = b.reduce((s, v) => s + v, 0) / b.length;
  let numerator = 0;
  let denomA = 0;
  let denomB = 0;
  for (let i = 0; i < a.length; i++) {
    const da = a[i] - meanA;
    const db = b[i] - meanB;
    numerator += da * db;
    denomA += da * da;
    denomB += db * db;
  }
  const denominator = Math.sqrt(denomA * denomB);
  if (denominator === 0) return 0;
  return safeNumber(numerator / denominator);
}

export function buildCombinedEquityFromReturns(
  dateIndex: string[],
  dailyReturns: number[][],
  startingCapital: number,
): EquityPoint[] {
  const weight = dailyReturns.length ? 1 / dailyReturns.length : 0;
  const combinedReturns = dailyReturns[0]?.map((_, idx) => {
    let sum = 0;
    for (const series of dailyReturns) {
      sum += series[idx] ?? 0;
    }
    return safeNumber(sum * weight);
  }) ?? [];

  const curve: EquityPoint[] = [];
  let equity = startingCapital;
  for (let i = 0; i < dateIndex.length; i++) {
    const ret = combinedReturns[i] ?? 0;
    equity *= 1 + ret;
    curve.push({ date: dateIndex[i], equity: safeNumber(equity) });
  }
  return curve;
}
