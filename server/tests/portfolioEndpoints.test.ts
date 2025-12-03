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
