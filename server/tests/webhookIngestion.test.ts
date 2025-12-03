import assert from "node:assert/strict";
import test from "node:test";

import { schema } from "@server/db";
import { ingestWebhookTrade } from "@server/services/tradeIngestion";
import * as dbModule from "@server/db";

function createMockDb() {
  const strategies: any[] = [{ id: 1, userId: 1, name: "Existing", type: "swing" }];
  const trades: any[] = [];
  const uploadLogs: any[] = [];

  const db = {
    select: () => ({
      from: () => ({
        where: async () => strategies,
      }),
    }),
    insert: (table: unknown) => ({
      values: (vals: any) => {
        const normalizedVals = Array.isArray(vals) ? vals : [vals];
        if (table === schema.trades) {
          trades.push(...normalizedVals);
          const baseId = trades.length - normalizedVals.length + 1;
          const insertedRows = normalizedVals.map((_, idx) => ({ id: baseId + idx }));
          return {
            onConflictDoNothing: () => ({ returning: async () => insertedRows }),
            returning: async () => insertedRows,
          };
        }
        if (table === schema.strategies) {
          const inserted = normalizedVals.map((v, idx) => ({ ...v, id: strategies.length + idx + 1 }));
          strategies.push(...inserted);
          return {
            returning: async () => inserted,
          };
        }
        if (table === schema.uploadLogs) {
          const inserted = normalizedVals.map((v, idx) => ({ ...v, id: uploadLogs.length + idx + 1 }));
          uploadLogs.push(...inserted);
          return {
            returning: async () => inserted,
          };
        }
        return { returning: async () => [] };
      },
    }),
    update: (table: unknown) => ({
      set: (vals: any) => ({
        where: () => ({
          returning: async () => {
            if (table === schema.uploadLogs && uploadLogs.length > 0) {
              Object.assign(uploadLogs[uploadLogs.length - 1], vals);
              return [uploadLogs[uploadLogs.length - 1]];
            }
            return [];
          },
        }),
      }),
    }),
  } as unknown as Awaited<ReturnType<typeof dbModule.getDb>>;

  return { db, strategies, trades, uploadLogs };
}

function withMockDb(mockDb: Awaited<ReturnType<typeof createMockDb>>, fn: () => Promise<void>) {
  const originalGetDb = (dbModule as any).getDb;
  (dbModule as any).getDb = async () => mockDb.db;

  return fn().finally(() => {
    (dbModule as any).getDb = originalGetDb;
  });
}

test("ingestWebhookTrade builds natural key and inserts", async () => {
  const mockDb = createMockDb();

  await withMockDb(mockDb, async () => {
    const result = await ingestWebhookTrade({
      userId: 1,      trade: {
        strategyName: "Webhook Alpha",
        symbol: "SPY",
        side: "long",
        quantity: 5,
        executionPrice: 100,
        timestamp: "2024-01-01T00:00:00Z",
        externalId: "tv-1",
      },
    });

    assert.ok(result.inserted);
    assert.ok(result.naturalKey?.includes("SPY"));
    assert.equal(mockDb.trades.length, 1);
    assert.equal(mockDb.uploadLogs.length, 1);
  });
});
