import assert from "node:assert/strict";
import test from "node:test";

import { portfolioRouter } from "@server/routers/portfolio";
import { adminDataRouter } from "@server/routers/adminData";
import { setAdminDataAdapter } from "@server/services/adminData";

const adapterMock = {
  listWorkspaceSummaries: async () => [],
  listUploadsForWorkspace: async () => ({ rows: [], total: 0 }),
  softDeleteByUpload: async () => ({ count: 0 }),
  softDeleteTradesByFilter: async () => 0,
  softDeleteBenchmarksByFilter: async () => 0,
};

test.before(() => {
  setAdminDataAdapter(adapterMock as any);
});

test.after(() => {
  setAdminDataAdapter(null);
});

const baseAuth = { mode: "local" as const, mock: true, strict: false };
const ownerUser = { id: 1, email: "owner@example.com", source: "local" as const, role: "admin" as const };
const otherUser = { id: 2, email: "user2@example.com", source: "local" as const, role: "user" as const };

const ownerCtx = { user: ownerUser, auth: { ...baseAuth, user: ownerUser } } as any;
const otherCtx = { user: otherUser, auth: { ...baseAuth, user: otherUser } } as any;

const janRange = { dateRange: { startDate: "2024-01-01", endDate: "2024-01-20" } } as const;
const febRange = { dateRange: { startDate: "2024-02-01", endDate: "2024-02-15" } } as const;

test("portfolio endpoints require authentication", async () => {
  const caller = portfolioRouter.createCaller({ user: null, auth: { ...baseAuth, user: null } } as any);
  await assert.rejects(() => caller.getOverview(), (err: any) => err.code === "UNAUTHORIZED");
});

test("portfolio endpoints scope results by owner", async () => {
  const ownerCaller = portfolioRouter.createCaller(ownerCtx);
  const otherCaller = portfolioRouter.createCaller(otherCtx);

  const ownerOverview = await ownerCaller.getOverview(janRange);
  assert.ok(ownerOverview.accountValue && Math.abs(ownerOverview.accountValue - 10965) < 1e-6);

  const otherOverview = await otherCaller.getOverview(febRange);
  assert.equal(otherOverview.dataHealth.hasTrades, true);
  assert.ok(otherOverview.accountValue && Math.abs(otherOverview.accountValue - 10100) < 1e-6);
  assert.equal(otherOverview.mtdPnl, 100);
  assert.equal(otherOverview.dataHealth.firstTradeDate, "2024-02-10");
});

test("strategy summaries return only owned strategies", async () => {
  const caller = portfolioRouter.createCaller(otherCtx);
  const summaries = await caller.getStrategySummaries(febRange);
  assert.equal(summaries.length, 1);
  assert.equal(summaries[0].strategyId, "3");
  assert.equal(summaries[0].stats.tradeCount, 1);
});

test("admin routes enforce elevated roles", async () => {
  const adminCaller = adminDataRouter.createCaller(ownerCtx);
  await adminCaller.listWorkspaces();

  const userCaller = adminDataRouter.createCaller(otherCtx);
  await assert.rejects(() => userCaller.listWorkspaces(), (err: any) => err.code === "FORBIDDEN");
});
