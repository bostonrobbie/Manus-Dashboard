import { StrategyType } from "@shared/types/portfolio";

export interface StrategyRow {
  id: number;
  userId: number;
  name: string;
  type: StrategyType;
  description?: string;
}

export interface TradeRow {
  id: number;
  userId: number;
  strategyId: number;
  symbol: string;
  side: "long" | "short";
  quantity: number;
  entryPrice: number;
  exitPrice: number;
  entryTime: string;
  exitTime: string;
}

export interface BenchmarkRow {
  date: string;
  close: number;
}

export const strategies: StrategyRow[] = [
  { id: 1, userId: 1, name: "Swing Core", type: "swing", description: "Core swing exposure" },
  { id: 2, userId: 1, name: "Intraday Scout", type: "intraday", description: "Tactical intraday entries" },
];

export const trades: TradeRow[] = [
  {
    id: 1,
    userId: 1,
    strategyId: 1,
    symbol: "AAPL",
    side: "long",
    quantity: 50,
    entryPrice: 180,
    exitPrice: 188,
    entryTime: "2024-01-02T15:30:00.000Z",
    exitTime: "2024-01-05T20:00:00.000Z",
  },
  {
    id: 2,
    userId: 1,
    strategyId: 1,
    symbol: "MSFT",
    side: "short",
    quantity: 30,
    entryPrice: 360,
    exitPrice: 350,
    entryTime: "2024-01-10T15:30:00.000Z",
    exitTime: "2024-01-12T20:00:00.000Z",
  },
  {
    id: 3,
    userId: 1,
    strategyId: 2,
    symbol: "TSLA",
    side: "long",
    quantity: 15,
    entryPrice: 240,
    exitPrice: 251,
    entryTime: "2024-01-15T15:45:00.000Z",
    exitTime: "2024-01-15T20:00:00.000Z",
  },
  {
    id: 4,
    userId: 1,
    strategyId: 2,
    symbol: "NVDA",
    side: "short",
    quantity: 10,
    entryPrice: 480,
    exitPrice: 470,
    entryTime: "2024-01-20T15:45:00.000Z",
    exitTime: "2024-01-20T20:00:00.000Z",
  },
];

export const benchmarks: BenchmarkRow[] = [
  { date: "2024-01-02", close: 4800 },
  { date: "2024-01-05", close: 4825 },
  { date: "2024-01-10", close: 4810 },
  { date: "2024-01-12", close: 4850 },
  { date: "2024-01-15", close: 4875 },
  { date: "2024-01-20", close: 4890 },
];
