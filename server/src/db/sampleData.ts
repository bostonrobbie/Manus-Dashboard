import { StrategyType } from "@shared/types/portfolio";

export interface StrategyRow {
  id: number;
  userId: number;
  ownerId: number;
  workspaceId: number;
  name: string;
  type: StrategyType;
  description?: string;
}

export interface TradeRow {
  id: number;
  userId: number;
  ownerId: number;
  workspaceId: number;
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
  ownerId: number;
  workspaceId: number;
}

export const strategies: StrategyRow[] = [
  { id: 1, userId: 1, ownerId: 1, workspaceId: 1, name: "Swing Core", type: "swing", description: "Core swing exposure" },
  {
    id: 2,
    userId: 1,
    ownerId: 1,
    workspaceId: 1,
    name: "Intraday Scout",
    type: "intraday",
    description: "Tactical intraday entries",
  },
  { id: 3, userId: 2, ownerId: 2, workspaceId: 2, name: "Growth Test", type: "swing" },
];

export const trades: TradeRow[] = [
  {
    id: 1,
    userId: 1,
    ownerId: 1,
    workspaceId: 1,
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
    ownerId: 1,
    workspaceId: 1,
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
    ownerId: 1,
    workspaceId: 1,
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
    ownerId: 1,
    workspaceId: 1,
    strategyId: 2,
    symbol: "NVDA",
    side: "short",
    quantity: 10,
    entryPrice: 480,
    exitPrice: 470,
    entryTime: "2024-01-20T15:45:00.000Z",
    exitTime: "2024-01-20T20:00:00.000Z",
  },
  {
    id: 5,
    userId: 2,
    ownerId: 2,
    workspaceId: 2,
    strategyId: 3,
    symbol: "QQQ",
    side: "long",
    quantity: 5,
    entryPrice: 380,
    exitPrice: 400,
    entryTime: "2024-02-01T15:30:00.000Z",
    exitTime: "2024-02-10T20:00:00.000Z",
  },
];

export const benchmarks: BenchmarkRow[] = [
  { date: "2024-01-02", close: 4800, workspaceId: 1, ownerId: 1 },
  { date: "2024-01-05", close: 4825, workspaceId: 1, ownerId: 1 },
  { date: "2024-01-10", close: 4810, workspaceId: 1, ownerId: 1 },
  { date: "2024-01-12", close: 4850, workspaceId: 1, ownerId: 1 },
  { date: "2024-01-15", close: 4875, workspaceId: 1, ownerId: 1 },
  { date: "2024-01-20", close: 4890, workspaceId: 1, ownerId: 1 },
  { date: "2024-02-02", close: 4950, workspaceId: 2, ownerId: 2 },
];
