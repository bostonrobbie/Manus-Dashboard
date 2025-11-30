import assert from "node:assert/strict";
import test from "node:test";

import { schema } from "@server/db";
import { ingestTradesCsv } from "@server/services/tradeIngestion";
import * as dbModule from "@server/db";

function createMockDb() {
  const strategies: any[] = [];
  const trades: any[] = [];

  const db = {
    select: () => ({
      from: () => ({
        where: async () => strategies,
      }),
    }),
    insert: (table: unknown) => ({
      values: (vals: any[]) => {
        if (table === schema.trades) {
          trades.push(...vals);
          return { returning: async () => [] };
        }
        return {
          returning: async () => {
            if (table === schema.strategies) {
              const inserted = vals.map((v, idx) => ({ ...v, id: strategies.length + idx + 1 }));
              strategies.push(...inserted);
              return inserted;
            }
            return [];
          },
        };
      },
    }),
  } as unknown as Awaited<ReturnType<typeof dbModule.getDb>>;

  return { db, strategies, trades };
}

function withMockDb(mockDb: Awaited<ReturnType<typeof createMockDb>>, fn: () => Promise<void>) {
  const originalGetDb = (dbModule as any).getDb;
  (dbModule as any).getDb = async () => mockDb.db;

  return fn().finally(() => {
    (dbModule as any).getDb = originalGetDb;
  });
}

test("ingestTradesCsv imports valid rows", async () => {
  const mockDb = createMockDb();
  const csv = [
    "symbol,side,quantity,entryPrice,exitPrice,entryTime,exitTime", // header
    "AAPL,long,10,100,110,2024-01-01T00:00:00Z,2024-01-02T00:00:00Z",
    "MSFT,short,5,200,195,2024-01-03T00:00:00Z,2024-01-04T00:00:00Z",
  ].join("\n");

  await withMockDb(mockDb, async () => {
    const result = await ingestTradesCsv({ csv, userId: 1, workspaceId: 1 });

    assert.equal(result.importedCount, 2);
    assert.equal(result.skippedCount, 0);
    assert.deepEqual(result.errors, []);
    assert.equal(mockDb.trades.length, 2);
    assert.ok(mockDb.strategies.length >= 1, "strategy created");
  });
});

test("ingestTradesCsv reports missing required columns", async () => {
  const mockDb = createMockDb();
  const csv = [
    "symbol,side,quantity,entryTime,exitTime", // missing price columns
    "AAPL,long,10,2024-01-01T00:00:00Z,2024-01-02T00:00:00Z",
  ].join("\n");

  await withMockDb(mockDb, async () => {
    const result = await ingestTradesCsv({ csv, userId: 1, workspaceId: 1 });

    assert.equal(result.importedCount, 0);
    assert.equal(result.skippedCount, 1);
    assert.ok(result.errors.some(err => err.toLowerCase().includes("missing required columns")));
  });
});

test("ingestTradesCsv skips invalid numeric or empty rows", async () => {
  const mockDb = createMockDb();
  const csv = [
    "symbol,side,quantity,entryPrice,exitPrice,entryTime,exitTime",
    "AAPL,long,abc,100,110,2024-01-01T00:00:00Z,2024-01-02T00:00:00Z", // invalid quantity
    "MSFT,short,5,200,195,2024-01-03T00:00:00Z,2024-01-04T00:00:00Z",
    " , , , , , , ", // empty row
  ].join("\n");

  await withMockDb(mockDb, async () => {
    const result = await ingestTradesCsv({ csv, userId: 1, workspaceId: 1 });

    assert.equal(result.importedCount, 1);
    assert.equal(result.skippedCount, 1); // one invalid row
    assert.equal(mockDb.trades.length, 1);
    assert.ok(result.errors.some(err => err.includes("Row 2")));
    assert.equal(result.importedCount + result.skippedCount, 2);
  });
});
