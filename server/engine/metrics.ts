
export interface MaxDrawdownResult {
  maxDrawdown: number; // negative drawdown in decimal form
  maxDrawdownPct: number; // percentage in decimal (negative)
  start: number;
  end: number;
}

export interface ReturnMetrics {
  totalReturn: number;
  cagr: number;
  volatility: number;
  sharpe: number;
  sortino: number;
  maxDrawdown: MaxDrawdownResult;
  calmar: number;
}

export interface TradeMetricResult {
  winRate: number;
  lossRate: number;
  avgWin: number;
  avgLoss: number;
  payoffRatio: number;
  profitFactor: number;
  expectancyPerTrade: number;
  rMultipleMean?: number;
  rMultipleMedian?: number;
  rMultipleStd?: number;
}

export interface TradeSample {
  pnl: number;
  initialRisk?: number | null;
}

export interface RiskGuidanceInput {
  expectancyPerTrade: number;
  maxDrawdownPct: number;
  targetMaxDrawdownPct?: number;
  startingEquity?: number;
}

export interface RiskGuidanceResult {
  recommendedRiskPerTradePct: number;
  recommendedRiskPerTradeAmount: number;
  maxLosingTradesBeforeTargetDD: number;
  conservative: boolean;
}

export function totalReturn(returns: number[]): number {
  if (!Array.isArray(returns) || returns.length === 0) return 0;
  return returns.reduce((acc, r) => acc * (1 + safeNumber(r)), 1) - 1;
}

export function cagr(returns: number[], periodsPerYear: number): number {
  if (!Array.isArray(returns) || returns.length === 0 || periodsPerYear <= 0) return 0;
  const years = returns.length / periodsPerYear;
  if (!Number.isFinite(years) || years <= 0) return 0;
  return Math.pow(1 + totalReturn(returns), 1 / years) - 1;
}

export function volatility(returns: number[]): number {
  if (!Array.isArray(returns) || returns.length === 0) return 0;
  const mean = returns.reduce((a, b) => a + safeNumber(b), 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + Math.pow(safeNumber(r) - mean, 2), 0) / returns.length;
  return Math.sqrt(Math.max(variance, 0));
}

export function sharpe(returns: number[], options: { riskFree?: number; periodsPerYear?: number } = {}): number {
  const { riskFree = 0, periodsPerYear = 1 } = options;
  if (!Array.isArray(returns) || returns.length === 0) return 0;
  const vol = volatility(returns);
  if (vol === 0) return 0;
  const excess = average(returns) - riskFree / periodsPerYear;
  return (excess / vol) * Math.sqrt(periodsPerYear);
}

export function sortino(
  returns: number[],
  options: { riskFree?: number; periodsPerYear?: number } = {},
): number {
  const { riskFree = 0, periodsPerYear = 1 } = options;
  if (!Array.isArray(returns) || returns.length === 0) return 0;

  const downside = returns.filter(r => safeNumber(r) < riskFree / periodsPerYear);
  if (downside.length === 0) return 0;
  const excessDownside = downside.map(r => r - riskFree / periodsPerYear);
  const downsideStd = volatility(excessDownside);
  if (downsideStd === 0) return 0;
  const excess = average(returns) - riskFree / periodsPerYear;
  return (excess / downsideStd) * Math.sqrt(periodsPerYear);
}

export function maxDrawdown(returns: number[]): MaxDrawdownResult {
  if (!Array.isArray(returns) || returns.length === 0) {
    return { maxDrawdown: 0, maxDrawdownPct: 0, start: 0, end: 0 };
  }

  let peak = 1;
  let maxDd = 0;
  let maxDdStart = 0;
  let maxDdEnd = 0;
  let currentPeakIndex = 0;
  let equity = 1;

  returns.forEach((r, idx) => {
    equity *= 1 + safeNumber(r);
    if (equity > peak) {
      peak = equity;
      currentPeakIndex = idx + 1;
    }
    const dd = equity / peak - 1;
    if (dd < maxDd) {
      maxDd = dd;
      maxDdStart = currentPeakIndex;
      maxDdEnd = idx + 1;
    }
  });

  return { maxDrawdown: maxDd, maxDrawdownPct: maxDd, start: maxDdStart, end: maxDdEnd };
}

export function calmar(returns: number[], periodsPerYear: number): number {
  const dd = maxDrawdown(returns).maxDrawdown;
  if (dd === 0) return 0;
  const annual = cagr(returns, periodsPerYear);
  return annual / Math.abs(dd);
}

export function computeReturnMetrics(
  returns: number[],
  options: { riskFree?: number; periodsPerYear?: number } = {},
): ReturnMetrics {
  const { riskFree = 0, periodsPerYear = 252 } = options;
  const mdd = maxDrawdown(returns);
  return {
    totalReturn: totalReturn(returns),
    cagr: cagr(returns, periodsPerYear),
    volatility: volatility(returns) * Math.sqrt(periodsPerYear),
    sharpe: sharpe(returns, { riskFree, periodsPerYear }),
    sortino: sortino(returns, { riskFree, periodsPerYear }),
    maxDrawdown: mdd,
    calmar: calmar(returns, periodsPerYear),
  };
}

export function computeTradeMetrics(trades: TradeSample[]): TradeMetricResult {
  if (!Array.isArray(trades) || trades.length === 0) {
    return {
      winRate: 0,
      lossRate: 0,
      avgWin: 0,
      avgLoss: 0,
      payoffRatio: 0,
      profitFactor: 0,
      expectancyPerTrade: 0,
    };
  }

  const wins = trades.filter(t => safeNumber(t.pnl) > 0).map(t => safeNumber(t.pnl));
  const losses = trades.filter(t => safeNumber(t.pnl) < 0).map(t => safeNumber(t.pnl));
  const winRate = trades.length > 0 ? wins.length / trades.length : 0;
  const lossRate = trades.length > 0 ? losses.length / trades.length : 0;

  const avgWin = wins.length ? average(wins) : 0;
  const avgLoss = losses.length ? average(losses) : 0;
  const payoffRatio = avgLoss !== 0 ? avgWin / Math.abs(avgLoss) : 0;

  const grossWins = wins.reduce((a, b) => a + b, 0);
  const grossLosses = Math.abs(losses.reduce((a, b) => a + b, 0));
  const profitFactor = grossLosses > 0 ? grossWins / grossLosses : grossWins > 0 ? Infinity : 0;

  const expectancyPerTrade = winRate * avgWin - lossRate * Math.abs(avgLoss);

  const rMultiples = trades
    .map(t => ({ pnl: safeNumber(t.pnl), risk: t.initialRisk ?? null }))
    .filter(t => t.risk != null && t.risk !== 0)
    .map(t => t.pnl / Number(t.risk));

  const rMultipleMean = rMultiples.length ? average(rMultiples) : undefined;
  const rMultipleMedian = rMultiples.length ? median(rMultiples) : undefined;
  const rMultipleStd = rMultiples.length ? stdDev(rMultiples) : undefined;

  return {
    winRate,
    lossRate,
    avgWin,
    avgLoss,
    payoffRatio,
    profitFactor,
    expectancyPerTrade,
    rMultipleMean,
    rMultipleMedian,
    rMultipleStd,
  };
}

export function safeNumber(value: number): number {
  return Number.isFinite(value) ? value : 0;
}

export function average(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((a, b) => a + safeNumber(b), 0) / values.length;
}

export function stdDev(values: number[]): number {
  if (!values.length) return 0;
  const mean = average(values);
  const variance = values.reduce((sum, v) => sum + Math.pow(safeNumber(v) - mean, 2), 0) / values.length;
  return Math.sqrt(Math.max(variance, 0));
}

export function median(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

export function clampRatio(value: number) {
  const lower = -1_000_000;
  const upper = 1_000_000;
  return Math.min(Math.max(value, lower), upper);
}

export function computeRiskGuidance(input: RiskGuidanceInput): RiskGuidanceResult {
  const startingEquity = input.startingEquity ?? 10_000;
  const targetMaxDrawdownPct =
    input.targetMaxDrawdownPct != null && Number.isFinite(input.targetMaxDrawdownPct)
      ? Math.max(Math.min(input.targetMaxDrawdownPct, 0.9), 0.01)
      : Math.max(Math.min(Math.abs(input.maxDrawdownPct) || 0.1, 0.5), 0.05);

  const expectancy = safeNumber(input.expectancyPerTrade);
  const baseRiskPct = expectancy > 0 ? Math.min(expectancy / 5, 0.02) : 0.0025;
  const conservative = expectancy <= 0 || input.maxDrawdownPct <= 0;
  const recommendedRiskPerTradePct = conservative ? Math.min(baseRiskPct, 0.005) : baseRiskPct;
  const recommendedRiskPerTradeAmount = startingEquity * recommendedRiskPerTradePct;

  const maxLossBudget = startingEquity * targetMaxDrawdownPct;
  const maxLosingTradesBeforeTargetDD = recommendedRiskPerTradeAmount > 0
    ? Math.max(Math.floor(maxLossBudget / recommendedRiskPerTradeAmount), 0)
    : 0;

  return {
    recommendedRiskPerTradePct,
    recommendedRiskPerTradeAmount,
    maxLosingTradesBeforeTargetDD,
    conservative,
  };
}
