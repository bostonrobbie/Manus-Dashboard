import assert from "node:assert/strict";
import test from "node:test";
import { computeReturnMetrics, computeTradeMetrics, maxDrawdown } from "../src/engine/metrics";

const approx = (value: number, expected: number, tol = 1e-4) =>
  assert.ok(Math.abs(value - expected) < tol, `${value} not within ${tol} of ${expected}`);

test("computes return metrics from synthetic equity path", () => {
  const returns = [0.1, -0.1, 0.212121];
  const metrics = computeReturnMetrics(returns, { periodsPerYear: 3 });

  approx(metrics.totalReturn, 0.199, 5e-3);
  approx(metrics.maxDrawdown.maxDrawdown, -0.1, 1e-3);
  approx(metrics.sharpe, metrics.sharpe); // ensure finite
  approx(metrics.sortino, metrics.sortino);
  approx(metrics.cagr, Math.pow(1.199, 1 / 1) - 1, 1e-3);
  approx(metrics.calmar, metrics.calmar);
});

test("computes trade metrics with wins and losses", () => {
  const trades = [
    { pnl: 100 },
    { pnl: -50 },
    { pnl: 200 },
    { pnl: -100 },
  ];
  const metrics = computeTradeMetrics(trades);

  approx(metrics.winRate, 0.5);
  approx(metrics.lossRate, 0.5);
  approx(metrics.avgWin, 150, 1e-6);
  approx(metrics.avgLoss, -75, 1e-6);
  approx(metrics.payoffRatio, 2, 1e-6);
  approx(metrics.expectancyPerTrade, 37.5, 1e-6);
  approx(metrics.profitFactor, 2, 1e-6);
});

test("max drawdown returns start and end indices", () => {
  const result = maxDrawdown([0.2, -0.3, 0.15]);
  assert.equal(result.start, 1);
  assert.equal(result.end, 2);
});
