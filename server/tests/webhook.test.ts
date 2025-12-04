import assert from "node:assert/strict";
import test from "node:test";
import request from "supertest";

import { createServer } from "@server/app";
import { schema } from "@server/db";
import * as dbModule from "@server/db";

const originalEnv = { ...process.env };

test.afterEach(() => {
  process.env = { ...originalEnv };
});

function extractCondition(condition: any) {
  const columnChunk = condition?.queryChunks?.find((c: any) => typeof c === "object" && (c.column || c.name));
  const valueChunk = condition?.queryChunks?.find((c: any) => typeof c === "string" || typeof c === "number");
  return { column: columnChunk?.column ?? columnChunk?.name, value: valueChunk };
}

function createMockDb() {
  const strategies: any[] = [{ id: 2, userId: 1, name: "Existing Strategy", type: "intraday" }];
  const trades: any[] = [];
  const webhookLogs: any[] = [];

  const mapRows = (rows: any[], fields: any) => {
    if (!fields) return rows;
    return rows.map(row => {
      const mapped: any = {};
      Object.keys(fields).forEach(key => {
        mapped[key] = row[key];
      });
      return mapped;
    });
  };

  const filterRows = (table: any, condition: any) => {
    const { column, value } = extractCondition(condition);
    const store = table === schema.strategies ? strategies : table === schema.trades ? trades : webhookLogs;
    if (!column) return store;
    return store.filter(row => row[column] === value);
  };

  const db = {
    select: (fields?: any) => ({
      from: (table: any) => ({
        where: (condition: any) => ({
          limit: async (count: number) => mapRows(filterRows(table, condition).slice(0, count), fields),
        }),
        limit: async (count: number) => mapRows(filterRows(table, undefined).slice(0, count), fields),
      }),
    }),
    insert: (table: any) => ({
      values: async (vals: any) => {
        const rows = Array.isArray(vals) ? vals : [vals];
        if (table === schema.trades) {
          rows.forEach(row => trades.push({ id: trades.length + 1, ...row }));
        } else if (table === schema.webhookLogs) {
          rows.forEach(row => webhookLogs.push({ id: webhookLogs.length + 1, ...row }));
        } else if (table === schema.strategies) {
          let insertId = strategies.length + 1;
          rows.forEach(row => {
            const id = row.id ?? insertId++;
            strategies.push({ ...row, id });
          });
          return { insertId: rows[0]?.id ?? strategies[strategies.length - 1]?.id };
        }
        return {};
      },
    }),
    delete: (table: any) => ({
      where: async () => {
        if (table === schema.trades) trades.splice(0, trades.length);
        if (table === schema.strategies) strategies.splice(0, strategies.length);
      },
    }),
  } as unknown as Awaited<ReturnType<typeof dbModule.getDb>>;

  return { db, strategies, trades, webhookLogs };
}

async function withMockDb<T>(mockDb: Awaited<ReturnType<typeof createMockDb>>, fn: () => Promise<T>) {
  (dbModule as any).setTestDb?.(mockDb.db);
  try {
    return await fn();
  } finally {
    (dbModule as any).setTestDb?.(null);
  }
}

test("TradingView webhook inserts trade and logs success", async () => {
  process.env.TRADINGVIEW_WEBHOOK_SECRET = "secret";
  const mockDb = createMockDb();

  await withMockDb(mockDb, async () => {
    const app = createServer();
    const response = await request(app)
      .post("/api/webhook/tradingview")
      .set("x-webhook-secret", "secret")
      .send({
        strategyName: "Existing Strategy",
        symbol: "SPY",
        side: "long",
        quantity: 10,
        entryPrice: 100,
        exitPrice: 101,
        entryTime: "2024-01-01T00:00:00Z",
        exitTime: "2024-01-01T01:00:00Z",
        alertId: "alert-1",
      });

    assert.equal(response.status, 200);
    assert.equal(mockDb.trades.length, 1);
    assert.equal(mockDb.webhookLogs.length, 1);
    assert.equal(mockDb.webhookLogs[0].status, "success");
  });
});

test("TradingView webhook rejects invalid secret and logs error", async () => {
  process.env.TRADINGVIEW_WEBHOOK_SECRET = "secret";
  const mockDb = createMockDb();

  await withMockDb(mockDb, async () => {
    const app = createServer();
    const response = await request(app)
      .post("/api/webhook/tradingview")
      .set("x-webhook-secret", "wrong")
      .send({});

    assert.equal(response.status, 403);
    assert.equal(mockDb.trades.length, 0);
    assert.equal(mockDb.webhookLogs.length, 1);
    assert.equal(mockDb.webhookLogs[0].status, "error");
  });
});

test("TradingView webhook rejects malformed payload and logs error", async () => {
  process.env.TRADINGVIEW_WEBHOOK_SECRET = "secret";
  const mockDb = createMockDb();

  await withMockDb(mockDb, async () => {
    const app = createServer();
    const response = await request(app)
      .post("/api/webhook/tradingview")
      .set("x-webhook-secret", "secret")
      .send({ symbol: "SPY" });

    assert.equal(response.status, 400);
    assert.equal(mockDb.trades.length, 0);
    assert.equal(mockDb.webhookLogs.length, 1);
    assert.equal(mockDb.webhookLogs[0].status, "error");
  });
});
