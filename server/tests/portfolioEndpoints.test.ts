import assert from "node:assert/strict";
import test from "node:test";

import { portfolioRouter } from "@server/routers/portfolio";
import { webhooksRouter } from "@server/routers/webhooks";

const user = { id: 1, email: "test@example.com", source: "local" as const };
const baseCtx = { user, auth: { mode: "local" as const, user, mock: true } } as any;

const createPortfolioCaller = () => portfolioRouter.createCaller(baseCtx);

test("portfolio.getEquityCurve returns normalized equity data", async () => {
  const caller = createPortfolioCaller();
  const result = await caller.getEquityCurve({ startDate: "2024-01-01", endDate: "2024-12-31" });

  assert.ok(result.points.length > 0);
  assert.ok(result.points[0].date);
  assert.equal(typeof result.points[0].combined, "number");
});

test("portfolio.getAnalytics returns metrics and drawdowns", async () => {
  const caller = createPortfolioCaller();
  const result = await caller.getAnalytics({ startDate: "2024-01-01", endDate: "2024-12-31" });

  assert.ok(result.metrics.totalReturnPct === 0 || Number.isFinite(result.metrics.totalReturnPct));
  assert.ok(result.equityCurve.length > 0);
  assert.equal(result.drawdowns.length > 0, true);
  assert.equal(typeof result.tradeCount, "number");
});

test("portfolio.getPositions summarizes trade history", async () => {
  const caller = createPortfolioCaller();
  const result = await caller.getPositions({ startDate: "2024-01-01", endDate: "2024-12-31" });

  assert.ok(Array.isArray(result.positions));
  assert.ok(result.positions.length >= 1);
  assert.ok(result.positions[0].status === "open" || result.positions[0].status === "closed");
});

test("webhooks.getLogs returns empty array without db", async () => {
  const caller = webhooksRouter.createCaller(baseCtx);
  const result = await caller.getLogs({ limit: 5 });

  assert.deepEqual(result.logs, []);
});

test("portfolio.overview matches contract schema", async () => {
  const caller = createPortfolioCaller();
  const result = await caller.overview({ timeRange: "ALL", startingCapital: 100000 });

  assert.ok(Array.isArray(result.equityCurve));
  assert.ok(result.equityCurve.length > 0);
  assert.ok(typeof result.metrics.portfolio.totalReturn === "number");
  assert.ok(typeof result.metrics.spy.sharpe === "number");
  assert.ok(typeof result.breakdown.daily.portfolio === "number");
  assert.equal(result.drawdownCurve.length, result.equityCurve.length);
});

test("portfolio.strategyDetail returns detailed analytics", async () => {
  const caller = createPortfolioCaller();
  const result = await caller.strategyDetail({ strategyId: 1, timeRange: "ALL", startingCapital: 100000 });

  assert.equal(result.strategy.id, 1);
  assert.ok(result.equityCurve.length > 0);
  assert.ok(result.drawdownCurve.length > 0);
  assert.ok(result.metrics.totalReturn === 0 || Number.isFinite(result.metrics.totalReturn));
  assert.ok(typeof result.breakdown.ytd === "number");
  assert.ok(Array.isArray(result.recentTrades));
});

test("portfolio.compareStrategies enforces strategy count and forward fills", async () => {
  const caller = createPortfolioCaller();

  await assert.rejects(
    async () => caller.compareStrategies({ strategyIds: [1], timeRange: "ALL", startingCapital: 100000 }),
    /between 2 and 4 strategies/,
  );

  const result = await caller.compareStrategies({ strategyIds: [1, 2], timeRange: "ALL", startingCapital: 100000 });

  assert.deepEqual(Object.keys(result.individualCurves).sort(), ["1", "2"]);
  assert.equal(result.correlationMatrix.matrix.length, 2);
  assert.equal(result.combinedCurve.length, result.individualCurves["1"].length);
  assert.ok(result.individualCurves["1"].every(point => typeof point.equity === "number"));
});
