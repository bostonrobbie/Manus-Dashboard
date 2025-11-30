import assert from "node:assert/strict";
import test from "node:test";
import { computeReturnMetrics, computeTradeMetrics, totalReturn } from "../src/engine/metrics";

test("return metrics respect drawdown and sharpe bounds", () => {
  for (let i = 0; i < 20; i++) {
    const returns = Array.from({ length: 50 }, () => (Math.random() - 0.5) / 10);
    const metrics = computeReturnMetrics(returns, { periodsPerYear: 252 });
    assert.ok(metrics.maxDrawdown.maxDrawdown <= 0, "drawdown should be non-positive");
    assert.ok(metrics.maxDrawdown.maxDrawdown >= -1, "drawdown should not exceed -100%");
    if (metrics.volatility !== 0) {
      assert.ok(Number.isFinite(metrics.sharpe), "sharpe should be finite with volatility");
    }
  }
});

test("zero return series has zero totals and drawdown", () => {
  const returns = Array(10).fill(0);
  const metrics = computeReturnMetrics(returns, { periodsPerYear: 12 });
  assert.equal(metrics.totalReturn, 0);
  assert.equal(metrics.maxDrawdown.maxDrawdown, 0);
  assert.equal(totalReturn(returns), 0);
});

test("trade metrics invariants", () => {
  const trades = [
    { pnl: 50 },
    { pnl: -25 },
    { pnl: 0 },
    { pnl: 10 },
  ];
  const metrics = computeTradeMetrics(trades);
  assert.ok(metrics.winRate >= 0 && metrics.winRate <= 1);
  assert.ok(metrics.lossRate >= 0 && metrics.lossRate <= 1);
  assert.ok(metrics.profitFactor >= 0);
  const noLoser = computeTradeMetrics([{ pnl: 100 }, { pnl: 50 }]);
  assert.ok(noLoser.profitFactor === Infinity || noLoser.profitFactor >= 0);
});
