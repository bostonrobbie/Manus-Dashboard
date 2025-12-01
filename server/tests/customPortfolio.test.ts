import test from "node:test";
import assert from "node:assert/strict";

import { portfolioRouter } from "@server/routers/portfolio";

const user = { id: 1, email: "test@example.com", workspaceId: 1, source: "local" as const };
const baseCtx = { user, auth: { mode: "local" as const, user, mock: true } } as any;

const timeRange = { preset: "ALL" as const };

test("builds custom portfolio with equal weights", async () => {
  const caller = portfolioRouter.createCaller(baseCtx);
  const result = await caller.customPortfolio({ strategyIds: [1, 2], timeRange });

  assert.equal(result.contributions.length, 2);
  assert.ok(result.equityCurve.points.length > 0, "equity series should not be empty");
  const weights = result.contributions.map(c => c.weight);
  assert.ok(weights.every(w => Math.abs(w - 0.5) < 1e-6));
});

test("honors provided weights and validation", async () => {
  const caller = portfolioRouter.createCaller(baseCtx);
  const result = await caller.customPortfolio({ strategyIds: [1, 2], weights: [0.8, 0.2], timeRange });

  const weightMap = new Map(result.contributions.map(c => [c.strategyId, c.weight] as const));
  assert.ok(Math.abs((weightMap.get(1) ?? 0) - 0.8) < 1e-6);
  assert.ok(Math.abs((weightMap.get(2) ?? 0) - 0.2) < 1e-6);

  await assert.rejects(async () => {
    await caller.customPortfolio({
      strategyIds: [1, 2] as [number, ...number[]],
      weights: [1] as any,
      timeRange,
    } as any);
  });
});
