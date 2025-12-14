import assert from "node:assert/strict";
import test, { mock } from "node:test";

import { portfolioRouter } from "@server/routers/portfolio";
import { setPortfolioProbe, systemRouter } from "@server/routers/system";
import * as portfolioEngine from "@server/portfolio-engine";
import * as db from "@server/db";

const user = { id: 1, email: "test@example.com", source: "local" as const };
const baseCtx = { user, auth: { mode: "local" as const, user, mock: true } } as any;

const janRange = { dateRange: { startDate: "2024-01-01", endDate: "2024-01-20" } } as const;

const createCaller = () => portfolioRouter.createCaller(baseCtx);

test("getOverview returns safe defaults without trades", async () => {
  const caller = createCaller();
  const result = await caller.getOverview({ dateRange: { startDate: "2024-02-01", endDate: "2024-02-10" } });

  assert.equal(result.dataHealth.hasTrades, false);
  assert.equal(result.todayPnl, 0);
  assert.equal(result.mtdPnl, 0);
  assert.equal(result.ytdPnl, 0);
  assert.equal(result.maxDrawdown, 0);
  assert.equal(result.portfolioEquity.length, 0);
});

test("getOverview aggregates pnl across the requested window", async () => {
  const caller = createCaller();
  const result = await caller.getOverview(janRange);

  assert.equal(result.dataHealth.hasTrades, true);
  assert.equal(result.todayPnl, 100);
  assert.equal(result.mtdPnl, 965);
  assert.equal(result.ytdPnl, 965);
  assert.ok(result.accountValue && Math.abs(result.accountValue - 10965) < 1e-6);
});

test("getStrategySummaries tolerates strategies without trades", async () => {
  const caller = createCaller();
  const result = await caller.getStrategySummaries({ dateRange: { startDate: "2024-01-01", endDate: "2024-01-10" } });

  assert.equal(result.length >= 2, true);
  const intraday = result.find(r => r.name === "Intraday Scout");
  assert.ok(intraday);
  assert.equal(intraday?.stats.tradeCount, 0);
  assert.equal(intraday?.equityCurve.length, 0);
});

test("system status reports ok and flags portfolio errors", async () => {
  const caller = systemRouter.createCaller(baseCtx);

  (db as any).setGetDbOverride?.(async () => ({ execute: async () => true } as any));
  const first = await caller.status();
  assert.equal(first.db, "ok");
  assert.ok(first.timestamp);

  const originalBuild = (portfolioEngine as any).buildPortfolioOverview;
  (db as any).setGetDbOverride?.(async () => ({ execute: async () => true } as any));
  setPortfolioProbe(async () => {
    throw new Error("probe failed");
  });

  const second = await caller.status();
  assert.equal(second.db, "ok");
  assert.equal(second.portfolioOverview, "error");
  setPortfolioProbe(originalBuild);
  (db as any).setGetDbOverride?.(null);
});
