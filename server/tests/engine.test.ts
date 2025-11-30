import test from "node:test";
import assert from "node:assert/strict";
import {
  ENGINE_CONFIG,
  computeDailyReturns,
  computeSharpeRatio,
  runMonteCarloSimulation,
} from "../src/engine/portfolio-engine";
import type { EquityCurvePoint } from "@shared/types/portfolio";
import { runFullHealthCheck } from "../src/health";

test("computes stable daily returns and sharpe ratio from equity series", () => {
  const points: EquityCurvePoint[] = [
    { date: "2024-01-01", combined: 0, swing: 0, intraday: 0, spx: 0 },
    { date: "2024-01-02", combined: 1_000, swing: 1_000, intraday: 0, spx: 0 },
    { date: "2024-01-03", combined: 500, swing: 500, intraday: 0, spx: 0 },
  ];

  const daily = computeDailyReturns(points, ENGINE_CONFIG.initialCapital);
  assert.equal(daily.length, points.length);
  assert.ok(Math.abs(daily[1] - 0.01) < 1e-5);
  assert.ok(Math.abs(daily[2] + 0.00495) < 1e-5);

  const sharpe = computeSharpeRatio(daily);
  assert.ok(sharpe > 4 && sharpe < 5);
});

test("handles zero and single-point series gracefully", () => {
  assert.deepEqual(computeDailyReturns([], ENGINE_CONFIG.initialCapital), []);
  assert.equal(computeSharpeRatio([Infinity, NaN]), 0);
});

test("monte carlo output stays bounded and aligned", async () => {
  let idx = 0;
  const sequence = [0.25, 0.75, 0.33, 0.66, 0.5, 0.9];
  const originalRandom = Math.random;
  Math.random = () => {
    const value = sequence[idx % sequence.length];
    idx += 1;
    return value;
  };

  const result = await runMonteCarloSimulation({ userId: 1, days: 5, simulations: 10 });
  Math.random = originalRandom;

  assert.equal(result.futureDates.length, 5);
  assert.equal(result.p10.length, 5);
  assert.equal(result.p50.length, 5);
  assert.equal(result.p90.length, 5);
  assert.ok(result.finalEquities.length > 0);
  assert.ok(result.p10.every(v => Number.isFinite(v)));
});

test("health endpoint reports ok and degraded states", async () => {
  const healthyDb = {
    execute: async () => true,
    select: () => ({
      from: () => ({
        limit: () => Promise.resolve([]),
      }),
    }),
  } as any;

  const healthy = await runFullHealthCheck(async () => healthyDb);
  assert.equal(healthy.body.db, "ok");
  assert.equal(healthy.body.status, "ok");
  assert.equal(healthy.body.mode, "LOCAL_DEV");
  assert.ok(typeof healthy.body.timestamp === "string");
  assert.ok(typeof healthy.body.version === "string");
  assert.ok(healthy.body.workspaces === "ok");
  assert.ok(healthy.body.uploads === "ok");

  const degraded = await runFullHealthCheck(async () => {
    throw new Error("db down");
  });
  assert.equal(degraded.status, 503);
  assert.equal(degraded.body.status, "error");
  assert.equal(degraded.body.db, "error");
  assert.equal(degraded.body.workspaces, "error");
  assert.equal(degraded.body.uploads, "error");
});
