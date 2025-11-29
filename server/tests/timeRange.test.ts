import assert from "node:assert/strict";
import test from "node:test";

import { schema } from "@server/db";
import { buildAggregatedEquityCurve, buildPortfolioOverview } from "@server/engine/portfolio-engine";
import * as dbModule from "@server/db";

function createMockDb() {
  const strategies = [
    { id: 1, userId: 1, name: "Swing", type: "swing" },
    { id: 2, userId: 1, name: "Intraday", type: "intraday" },
  ];

  const trades = [
    {
      id: 1,
      userId: 1,
      strategyId: 1,
      symbol: "AAA",
      side: "long",
      quantity: 10,
      entryPrice: 100,
      exitPrice: 110,
      entryTime: "2023-12-15T00:00:00.000Z",
      exitTime: "2023-12-20T00:00:00.000Z",
    },
    {
      id: 2,
      userId: 1,
      strategyId: 1,
      symbol: "BBB",
      side: "long",
      quantity: 10,
      entryPrice: 100,
      exitPrice: 105,
      entryTime: "2024-02-10T00:00:00.000Z",
      exitTime: "2024-02-12T00:00:00.000Z",
    },
    {
      id: 3,
      userId: 1,
      strategyId: 2,
      symbol: "CCC",
      side: "short",
      quantity: 5,
      entryPrice: 50,
      exitPrice: 45,
      entryTime: "2024-07-01T00:00:00.000Z",
      exitTime: "2024-07-05T00:00:00.000Z",
    },
    {
      id: 4,
      userId: 1,
      strategyId: 2,
      symbol: "DDD",
      side: "short",
      quantity: 8,
      entryPrice: 80,
      exitPrice: 70,
      entryTime: "2024-08-01T00:00:00.000Z",
      exitTime: "2024-08-03T00:00:00.000Z",
    },
  ];

  const benchmarks = [
    { date: "2023-12-20", close: 4500 },
    { date: "2024-02-12", close: 4600 },
    { date: "2024-07-05", close: 4700 },
    { date: "2024-08-03", close: 4750 },
  ];

  const db = {
    select: () => ({
      from: (table: unknown) => ({
        where: async () => {
          if (table === schema.trades) return trades;
          if (table === schema.strategies) return strategies;
          if (table === schema.benchmarks) return benchmarks;
          return [];
        },
      }),
    }),
  } as unknown as Awaited<ReturnType<typeof dbModule.getDb>>;

  return { db, trades };
}

function withMockDb(mockDb: Awaited<ReturnType<typeof createMockDb>>, fn: () => Promise<void>) {
  const originalGetDb = (dbModule as any).getDb;
  (dbModule as any).getDb = async () => mockDb.db;

  return fn().finally(() => {
    (dbModule as any).getDb = originalGetDb;
  });
}

test("time ranges filter portfolio analytics", async () => {
  const mockDb = createMockDb();

  await withMockDb(mockDb, async () => {
    const fullCurve = await buildAggregatedEquityCurve(1, {});
    const recentCurve = await buildAggregatedEquityCurve(1, { startDate: "2024-07-01", endDate: "2024-08-31" });

    assert.ok(fullCurve.points.length > recentCurve.points.length, "recent curve should be downsampled by range");

    const fullOverview = await buildPortfolioOverview(1, {});
    const recentOverview = await buildPortfolioOverview(1, { startDate: "2024-07-01", endDate: "2024-08-31" });

    assert.equal(fullOverview.totalTrades, mockDb.trades.length);
    assert.equal(recentOverview.totalTrades, 2, "only recent trades counted");
    assert.ok(fullOverview.totalTrades > recentOverview.totalTrades);
  });
});

