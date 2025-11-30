import assert from "node:assert/strict";
import test from "node:test";

import { schema } from "@server/db";
import * as dbModule from "@server/db";
import { adminDataRouter } from "@server/routers/adminData";
import { setAdminDataAdapter } from "@server/services/adminData";
import { loadTrades } from "@server/engine/portfolio-engine";

const adminUser = { id: 1, email: "admin@test", roles: ["admin"], workspaceId: 1, source: "manus" as const };
const regularUser = { id: 2, email: "user@test", roles: ["user"], workspaceId: 1, source: "manus" as const };

class MemoryAdminAdapter {
  workspaces = [{ id: 1, externalId: "ws-1", name: "One" }];
  uploads = [
    {
      id: 10,
      userId: 1,
      workspaceId: 1,
      fileName: "upload.csv",
      uploadType: "trades" as const,
      rowCountTotal: 2,
      rowCountImported: 2,
      rowCountFailed: 0,
      status: "success" as const,
      startedAt: new Date("2024-01-01T00:00:00Z"),
      finishedAt: new Date("2024-01-01T01:00:00Z"),
      errorSummary: null,
      warningsSummary: null,
    },
  ];
  trades = [
    {
      id: 1,
      strategyId: 1,
      userId: 1,
      workspaceId: 1,
      symbol: "ES",
      side: "long",
      quantity: 1,
      entryPrice: 1,
      exitPrice: 2,
      entryTime: new Date("2024-01-02T00:00:00Z"),
      exitTime: new Date("2024-01-03T00:00:00Z"),
      uploadId: 10,
      deletedAt: null as Date | null,
    },
    {
      id: 2,
      strategyId: 1,
      userId: 1,
      workspaceId: 1,
      symbol: "NQ",
      side: "long",
      quantity: 1,
      entryPrice: 1,
      exitPrice: 2,
      entryTime: new Date("2024-01-02T00:00:00Z"),
      exitTime: new Date("2024-01-05T00:00:00Z"),
      uploadId: 11,
      deletedAt: null as Date | null,
    },
  ];
  benchmarks = [
    {
      id: 1,
      workspaceId: 1,
      symbol: "SPY",
      date: "2024-01-01",
      close: 1,
      uploadId: 12,
      deletedAt: null as Date | null,
      createdAt: new Date("2024-01-01T00:00:00Z"),
    },
  ];

  async listWorkspaceSummaries() {
    return this.workspaces.map(ws => ({
      id: ws.id,
      externalId: ws.externalId,
      name: ws.name,
      tradeCount: this.trades.filter(t => t.workspaceId === ws.id && !t.deletedAt).length,
      benchmarkCount: this.benchmarks.filter(b => b.workspaceId === ws.id && !b.deletedAt).length,
      lastUploadAt: this.uploads.find(u => u.workspaceId === ws.id)?.startedAt ?? null,
    }));
  }

  async listUploadsForWorkspace(params: { workspaceId: number; page: number; pageSize: number }) {
    const rows = this.uploads.filter(u => u.workspaceId === params.workspaceId);
    return { rows, total: rows.length };
  }

  async softDeleteByUpload(uploadId: number) {
    let tradesDeleted = 0;
    let benchmarksDeleted = 0;
    this.trades.forEach(t => {
      if (t.uploadId === uploadId && !t.deletedAt) {
        t.deletedAt = new Date();
        tradesDeleted += 1;
      }
    });
    this.benchmarks.forEach(b => {
      if (b.uploadId === uploadId && !b.deletedAt) {
        b.deletedAt = new Date();
        benchmarksDeleted += 1;
      }
    });
    return { tradesDeleted, benchmarksDeleted };
  }

  async softDeleteTradesByFilter(params: { workspaceId: number; symbol?: string }) {
    let deleted = 0;
    this.trades.forEach(t => {
      if (t.workspaceId !== params.workspaceId) return;
      if (params.symbol && t.symbol !== params.symbol) return;
      if (!t.deletedAt) {
        t.deletedAt = new Date();
        deleted += 1;
      }
    });
    return deleted;
  }

  async softDeleteBenchmarksByFilter(params: { workspaceId: number }) {
    let deleted = 0;
    this.benchmarks.forEach(b => {
      if (b.workspaceId !== params.workspaceId) return;
      if (!b.deletedAt) {
        b.deletedAt = new Date();
        deleted += 1;
      }
    });
    return deleted;
  }
}

const withAdapter = async (adapter: MemoryAdminAdapter, fn: () => Promise<void>) => {
  setAdminDataAdapter(adapter as any);
  try {
    await fn();
  } finally {
    setAdminDataAdapter(null);
  }
};

test("non-admin calls are rejected", async () => {
  const caller = adminDataRouter.createCaller({ user: regularUser, auth: { mode: "manus", user: regularUser } } as any);
  await assert.rejects(() => caller.listWorkspaces(), /Admin privileges required/);
});

test("workspace summary ignores deleted rows", async () => {
  const adapter = new MemoryAdminAdapter();
  adapter.trades[0].deletedAt = new Date();

  await withAdapter(adapter, async () => {
    const caller = adminDataRouter.createCaller({ user: adminUser, auth: { mode: "manus", user: adminUser } } as any);
    const res = await caller.listWorkspaces();
    assert.equal(res[0].tradeCount, 1);
    assert.equal(res[0].benchmarkCount, 1);
  });
});

test("soft delete by upload updates downstream portfolio queries", async () => {
  const adapter = new MemoryAdminAdapter();

  await withAdapter(adapter, async () => {
    const caller = adminDataRouter.createCaller({ user: adminUser, auth: { mode: "manus", user: adminUser } } as any);
    const outcome = await caller.softDeleteByUpload({ uploadId: 10 });
    assert.equal(outcome.tradesDeleted, 1);

    const mockDb = {
      select: () => ({
        from: (table: unknown) => ({
          where: () => {
            if (table === schema.trades) return adapter.trades;
            if (table === schema.benchmarks) return adapter.benchmarks;
            return [];
          },
        }),
      }),
    } as any;

    const originalGetDb = (dbModule as any).getDb;
    (dbModule as any).getDb = async () => mockDb;

    try {
      const trades = await loadTrades({ userId: 1, workspaceId: 1 });
      assert.equal(trades.length, 1, "soft-deleted trade is excluded");
    } finally {
      (dbModule as any).getDb = originalGetDb;
    }
  });
});

test("soft delete filters respect symbol", async () => {
  const adapter = new MemoryAdminAdapter();
  adapter.trades[0].symbol = "ES";
  adapter.trades[1].symbol = "NQ";

  await withAdapter(adapter, async () => {
    const caller = adminDataRouter.createCaller({ user: adminUser, auth: { mode: "manus", user: adminUser } } as any);
    const res = await caller.softDeleteTradesByFilter({ workspaceId: 1, symbol: "ES" });
    assert.equal(res.count, 1);
    assert.ok(adapter.trades[0].deletedAt);
    assert.ok(!adapter.trades[1].deletedAt);
  });
});

test("soft delete filters reject invalid workspace or dates", async () => {
  const adapter = new MemoryAdminAdapter();

  await withAdapter(adapter, async () => {
    const caller = adminDataRouter.createCaller({ user: adminUser, auth: { mode: "manus", user: adminUser } } as any);

    await assert.rejects(() => caller.softDeleteTradesByFilter({ workspaceId: 0 }), /Number must be greater than 0/);
    await assert.rejects(
      () => caller.softDeleteTradesByFilter({ workspaceId: 1, startDate: "2024-02-02", endDate: "2024-01-01" }),
      /startDate must be before or equal to endDate/,
    );
    await assert.rejects(
      () => caller.softDeleteBenchmarksByFilter({ workspaceId: 1, startDate: "bad-date" }),
      /Invalid/,
    );
  });
});
