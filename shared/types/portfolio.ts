export type TimeRangePreset = "1M" | "3M" | "6M" | "YTD" | "1Y" | "ALL";

export interface TimeRange {
  preset: TimeRangePreset;
  startDate?: string; // ISO YYYY-MM-DD (derived from selector or manual overrides)
  endDate?: string; // ISO YYYY-MM-DD (derived from selector or manual overrides)
}

export type StrategyType = "swing" | "intraday";

export interface WorkspaceMetrics {
  totalReturnPct: number;
  cagrPct: number;
  volatilityPct: number;
  sharpe: number;
  sortino: number;
  calmar: number;
  maxDrawdownPct: number;
  winRatePct: number;
  lossRatePct: number;
  avgWin: number;
  avgLoss: number;
  payoffRatio: number;
  profitFactor: number;
  expectancyPerTrade: number;
  alpha: number | null;
}

export interface StrategyMetrics {
  totalReturnPct: number;
  maxDrawdownPct: number;
  sharpeRatio: number;
  sortinoRatio?: number;
  cagr?: number;
  calmar?: number;
  winRatePct: number;
  lossRatePct: number;
  profitFactor: number;
  expectancy?: number;
  payoffRatio?: number;
  tradeCount: number;
}

export interface StrategySummary {
  id: number;
  name: string;
  type: StrategyType;
  description?: string;
}

export interface EquityCurvePoint {
  date: string;
  combined: number;
  swing: number;
  intraday: number;
  spx: number;
}

export interface EquityCurveResponse {
  points: EquityCurvePoint[];
}

export interface DrawdownPoint {
  date: string;
  combined: number;
  swing: number;
  intraday: number;
  spx: number;
}

export interface DrawdownResponse {
  points: DrawdownPoint[];
}

export interface StrategyComparisonRow {
  strategyId: number;
  name: string;
  type: StrategyType;
  totalReturn: number;
  totalReturnPct: number;
  maxDrawdown: number;
  maxDrawdownPct: number;
  sharpeRatio: number;
  sortinoRatio?: number;
  cagr?: number;
  calmar?: number;
  winRatePct: number;
  lossRatePct?: number;
  totalTrades: number;
  profitFactor: number;
  expectancy?: number;
  payoffRatio?: number;
  sparkline?: { date: string; value: number }[];
}

export interface StrategyComparisonResult {
  rows: StrategyComparisonRow[];
  total: number;
}

export interface TradeRow {
  id: number;
  userId?: number;
  workspaceId?: number;
  strategyId: number;
  symbol: string;
  side: string;
  quantity: number;
  entryPrice: number;
  exitPrice: number;
  entryTime: string;
  exitTime: string;
  initialRisk?: number;
}

export interface PortfolioOverview {
  equity: number;
  dailyPnL: number;
  dailyReturn: number;
  totalReturn: number;
  totalReturnPct?: number;
  sharpeRatio: number;
  sortinoRatio?: number;
  cagr?: number;
  calmar?: number;
  volatility?: number;
  maxDrawdown: number;
  currentDrawdown: number;
  maxDrawdownPct?: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  lossRate?: number;
  profitFactor: number;
  expectancy?: number;
  positions: number;
  lastUpdated: Date;
  metrics?: WorkspaceMetrics;
}

export interface ExportTradesInput {
  userId: number;
  workspaceId?: number;
  strategyIds?: number[];
  startDate?: string; // derived from time range selector unless explicitly set
  endDate?: string; // derived from time range selector unless explicitly set
  timeRange?: TimeRange;
}

export interface ExportTradesResponse {
  filename: string;
  mimeType: string;
  content: string;
}

export interface MonteCarloResult {
  futureDates: string[];
  p10: number[];
  p50: number[];
  p90: number[];
  currentEquity: number;
  finalEquities: number[];
}

export interface PortfolioSummary {
  totalReturnPct: number;
  maxDrawdownPct: number;
  sharpeRatio: number;
  winRatePct: number;
}
