import assert from "node:assert/strict";
import test from "node:test";

import { TRPCError } from "@trpc/server";

import { schema } from "@server/db";
import { ingestTradesCsv } from "@server/services/tradeIngestion";
import { enforceUploadGuards } from "@server/routers/portfolio";
import * as dbModule from "@server/db";

const shouldSkipIngestion = process.env.NODE_ENV === "test" && process.env.USE_REAL_DB !== "true";
const maybeTest = (name: string, fn: () => Promise<void> | void) => test(name, { skip: shouldSkipIngestion }, fn);

function createMockDb() {
  const strategies: any[] = [];
  const trades: any[] = [];
  const uploadLogs: any[] = [];

  const db = {
    select: () => ({
      from: () => ({
        where: async () => strategies,
      }),
    }),
    insert: (table: unknown) => ({
      values: (vals: any[]) => {
        const normalizedVals = Array.isArray(vals) ? vals : [vals];
        if (table === schema.trades) {
          trades.push(...normalizedVals);
          return { returning: async () => [] };
        }
        return {
          returning: async () => {
            if (table === schema.strategies) {
              const inserted = normalizedVals.map((v, idx) => ({ ...v, id: strategies.length + idx + 1 }));
              strategies.push(...inserted);
              return inserted;
            }
            if (table === schema.uploadLogs) {
              const inserted = normalizedVals.map((v, idx) => ({ ...v, id: uploadLogs.length + idx + 1 }));
              uploadLogs.push(...inserted);
              return inserted;
            }
            return [];
          },
        };
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
  (dbModule as any).setTestDb?.(mockDb.db);

  return fn().finally(() => {
    (dbModule as any).setTestDb?.(null);
  });
}

maybeTest("ingestTradesCsv imports valid rows", async () => {
  const mockDb = createMockDb();
  const csv = [
    "symbol,side,quantity,entryPrice,exitPrice,entryTime,exitTime", // header
    "AAPL,long,10,100,110,2024-01-01T00:00:00Z,2024-01-02T00:00:00Z",
    "MSFT,short,5,200,195,2024-01-03T00:00:00Z,2024-01-04T00:00:00Z",
  ].join("\n");

  await withMockDb(mockDb, async () => {
    const result = await ingestTradesCsv({ csv, userId: 1, fileName: "sample.csv" });

    assert.equal(result.importedCount, 2);
    assert.equal(result.skippedCount, 0);
    assert.equal(result.failedCount, 0);
    assert.deepEqual(result.errors, []);
    assert.deepEqual(result.warnings, []);
    assert.equal(mockDb.trades.length, 2);
    assert.ok(mockDb.strategies.length >= 1, "strategy created");
    assert.equal(mockDb.uploadLogs.length, 1);
    assert.equal(mockDb.uploadLogs[0].status, "success");
    assert.equal(mockDb.uploadLogs[0].rowCountImported, 2);
  });
});

maybeTest("ingestTradesCsv reports missing required columns", async () => {
  const mockDb = createMockDb();
  const csv = [
    "symbol,side,quantity,entryTime,exitTime", // missing price columns
    "AAPL,long,10,2024-01-01T00:00:00Z,2024-01-02T00:00:00Z",
  ].join("\n");

  await withMockDb(mockDb, async () => {
    const result = await ingestTradesCsv({ csv, userId: 1 });

    assert.equal(result.importedCount, 0);
    assert.equal(result.skippedCount, 1);
    assert.equal(result.failedCount, 1);
    assert.ok(result.errors.some(err => err.toLowerCase().includes("missing required columns")));
    assert.ok(result.headerIssues?.missing.includes("entry price"));
    assert.equal(mockDb.uploadLogs[0].status, "failed");
    assert.equal(mockDb.uploadLogs[0].rowCountFailed, 1);
  });
});

maybeTest("ingestTradesCsv skips invalid numeric or empty rows", async () => {
  const mockDb = createMockDb();
  const csv = [
    "symbol,side,quantity,entryPrice,exitPrice,entryTime,exitTime",
    "AAPL,long,abc,100,110,2024-01-01T00:00:00Z,2024-01-02T00:00:00Z", // invalid quantity
    "MSFT,short,5,200,195,2024-01-03T00:00:00Z,2024-01-04T00:00:00Z",
    " , , , , , , ", // empty row
  ].join("\n");

  await withMockDb(mockDb, async () => {
    const result = await ingestTradesCsv({ csv, userId: 1 });

    assert.equal(result.importedCount, 1);
    assert.equal(result.skippedCount, 1); // one invalid row
    assert.equal(result.failedCount, 1);
    assert.equal(mockDb.trades.length, 1);
    assert.ok(result.errors.some(err => err.includes("Row 2")));
    assert.equal(result.importedCount + result.skippedCount, 2);
    assert.equal(mockDb.uploadLogs[0].status, "partial");
    assert.ok(mockDb.uploadLogs[0].errorSummary);
  });
});

maybeTest("ingestTradesCsv flags invalid dates", async () => {
  const mockDb = createMockDb();
  const csv = [
    "symbol,side,quantity,entryPrice,exitPrice,entryTime,exitTime",
    "AAPL,long,10,100,110,not-a-date,2024-01-02T00:00:00Z",
  ].join("\n");

  await withMockDb(mockDb, async () => {
    const result = await ingestTradesCsv({ csv, userId: 1 });

    assert.equal(result.importedCount, 0);
    assert.equal(result.failedCount, 1);
    assert.ok(result.errors.some(err => err.toLowerCase().includes("invalid")));
    assert.equal(mockDb.uploadLogs[0].status, "failed");
  });
});

test("enforceUploadGuards rejects oversized files", () => {
  const oversizedCsv = "a".repeat(5 * 1024 * 1024 + 2);
  try {
    enforceUploadGuards(oversizedCsv, "trades.csv");
    assert.fail("Expected guard to throw");
  } catch (error) {
    assert.ok(error instanceof TRPCError);
    assert.equal((error as TRPCError).code, "PAYLOAD_TOO_LARGE");
  }
});
