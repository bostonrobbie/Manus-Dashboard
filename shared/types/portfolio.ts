export type StrategyType = "swing" | "intraday";

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
  winRatePct: number;
  totalTrades: number;
  profitFactor: number;
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
}

export interface PortfolioSummary {
  totalReturnPct: number;
  maxDrawdownPct: number;
  sharpeRatio: number;
  winRatePct: number;
}
