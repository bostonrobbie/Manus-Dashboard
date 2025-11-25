import { resolveStrategyMeta } from "./mockPortfolio";

export interface StrategyDailyRow {
  strategyId: number;
  strategyName: string;
  strategyType: "swing" | "intraday";
  tradeDate: string;
  pnl: number;
  notional: number;
}

export interface BenchmarkDailyRow {
  tradeDate: string;
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
  metadata: {
    userId: number;
    startDate?: string;
    endDate?: string;
    totalPoints: number;
  };
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
  metadata: MultiCurveResult["metadata"];
}

export interface StrategyComparisonRow {
  strategyId: number;
  name: string;
  type: "swing" | "intraday";
  pnl: number;
  notionalSum: number;
  equitySeries: number[];
  tradeReturns: number[];
  wins: number;
  losses: number;
  grossProfit: number;
  grossLoss: number;
  maxDrawdown: number;
  sharpe: number;
  sortino: number;
  winRate: number;
  avgWin: number;
  avgLoss: number;
  profitFactor: number;
  dailyEquityByDate: Map<string, number>;
}

export interface EquityCurveOptions {
  startDate?: string;
  endDate?: string;
  maxPoints?: number;
}

function normalizeDate(value: string | Date): string {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  return value.slice(0, 10);
}

async function normalizeStrategyRows(
  userId: number,
  opts: EquityCurveOptions = {},
): Promise<StrategyDailyRow[]> {
  const rows = await loadStrategyDailyRows(userId, opts.startDate, opts.endDate);
  return rows
    .map((row) => {
      const meta = resolveStrategyMeta(row.strategyId);
      return {
        strategyId: row.strategyId,
        strategyName: meta.name,
        strategyType: (row.strategyType as "swing" | "intraday") ?? meta.type,
        tradeDate: normalizeDate(row.tradeDate),
        pnl: Number(row.pnl ?? 0),
        notional: Number(row.notional ?? 0),
      } satisfies StrategyDailyRow;
    })