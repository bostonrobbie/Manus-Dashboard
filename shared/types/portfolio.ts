export type TimeRangePreset = "1M" | "3M" | "6M" | "YTD" | "1Y" | "3Y" | "5Y" | "ALL";

export interface TimeRange {
  preset: TimeRangePreset;
  startDate?: string; // ISO YYYY-MM-DD (derived from selector or manual overrides)
  endDate?: string; // ISO YYYY-MM-DD (derived from selector or manual overrides)
}

export type StrategyType = "swing" | "intraday";

export interface PortfolioMetrics {
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
  riskOfRuin?: RiskOfRuinResult;
}

export interface RiskOfRuinInput {
  winRate: number;
  avgWin: number;
  avgLoss: number;
  riskPerTradePct: number;
  startingEquity?: number;
}

export interface RiskOfRuinResult {
  riskOfRuinFraction: number; // 0-1
  riskOfRuinPct: number; // 0-100
  breakEvenWinRate: number; // 0-1
  edgePerTrade: number;
  riskPerTradePct: number;
  startingEquity: number;
  riskUnits: number;
}

export interface RiskGuidanceInput {
  expectancyPerTrade: number;
  maxDrawdownPct: number;
  targetMaxDrawdownPct: number;
  startingEquity: number;
}

export interface RiskGuidanceResult {
  recommendedRiskPerTradePct: number;
  recommendedRiskPerTradeAmount: number;
  maxLosingTradesBeforeTargetDD: number;
  conservative?: boolean;
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

export interface EdgeBucketBySymbol {
  symbol: string;
  pnl: number;
  trades: number;
}

export interface EdgeBucketByHour {
  hour: number;
  pnl: number;
  trades: number;
}

export interface EdgeBucketByDow {
  dow: number;
  pnl: number;
  trades: number;
}

export interface PortfolioEdge {
  bySymbol: EdgeBucketBySymbol[];
  byHour: EdgeBucketByHour[];
  byDow: EdgeBucketByDow[];
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

export interface TradeFilter {
  startDate?: string;
  endDate?: string;
  symbols?: string[];
  strategyIds?: number[];
  side?: "long" | "short";
  outcome?: "win" | "loss";
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
  metrics?: PortfolioMetrics;
  edge?: PortfolioEdge;
}

export interface ExportTradesInput {
  userId: number;
  strategyIds?: number[];
  startDate?: string; // derived from time range selector unless explicitly set
  endDate?: string; // derived from time range selector unless explicitly set
  symbols?: string[];
  side?: "long" | "short";
  outcome?: "win" | "loss";
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

export interface CustomPortfolioRequest {
  strategyIds: number[];
  weights?: number[];
  timeRange?: TimeRange;
  maxPoints?: number;
}

export interface CustomPortfolioContribution {
  strategyId: number;
  name: string;
  weight: number;
  totalReturnPct: number;
  maxDrawdownPct: number;
  sharpeRatio: number;
  tradeCount: number;
}

export interface CustomPortfolioResult {
  metrics: PortfolioMetrics;
  equityCurve: EquityCurveResponse;
  contributions: CustomPortfolioContribution[];
}

export interface PortfolioSummary {
  totalReturnPct: number;
  maxDrawdownPct: number;
  sharpeRatio: number;
  winRatePct: number;
}

export interface ComparisonPayload {
  strategies: Array<{
    strategyId: number;
    name: string;
    metrics: StrategyMetrics;
    equityCurve: { date: string; value: number }[];
  }>;
}

export interface PortfolioReportMeta {
  userId: number;
  portfolioName?: string;
  period: TimeRange;
  generatedAt: string;
  version?: string;
}

export interface PortfolioReport {
  meta: PortfolioReportMeta;
  portfolioMetrics: PortfolioMetrics;
  strategyMetrics: { strategyId: number; name: string; metrics: StrategyMetrics }[];
  edge: PortfolioEdge;
}
