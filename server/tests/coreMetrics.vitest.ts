import { describe, expect, it } from "vitest";

import { cagr, calmar, computeReturnMetrics, maxDrawdown, volatility } from "@server/engine/metrics";
import {
  buildCombinedEquityFromReturns,
  buildCorrelationMatrix,
  buildDateIndex,
  computeDailyReturnSeries,
  computeMetricBundle,
  forwardFillEquity,
} from "@server/core/portfolioMetrics";

const toBeClose = (actual: number, expected: number) => expect(actual).toBeCloseTo(expected, 6);

describe("core metric calculations", () => {
  it("computes annualized metrics for deterministic monthly returns", () => {
    const monthlyReturns = [0.1, -0.05, 0.02];
    const metrics = computeReturnMetrics(monthlyReturns, { periodsPerYear: 12 });

    const cumulative = (1 + monthlyReturns[0]) * (1 + monthlyReturns[1]) * (1 + monthlyReturns[2]) - 1;
    const years = monthlyReturns.length / 12;
    const expectedCagr = Math.pow(1 + cumulative, 1 / years) - 1;
    const mean = monthlyReturns.reduce((sum, r) => sum + r, 0) / monthlyReturns.length;
    const variance = monthlyReturns
      .map(r => Math.pow(r - mean, 2))
      .reduce((sum, r) => sum + r, 0) / monthlyReturns.length;
    const expectedVol = Math.sqrt(variance) * Math.sqrt(12);
    const expectedSharpe = (mean / Math.sqrt(variance)) * Math.sqrt(12);
    const expectedMaxDd = maxDrawdown(monthlyReturns).maxDrawdown;

    toBeClose(metrics.totalReturn, cumulative);
    toBeClose(metrics.cagr, expectedCagr);
    toBeClose(metrics.volatility, expectedVol);
    toBeClose(metrics.sharpe, expectedSharpe);
    toBeClose(metrics.maxDrawdown.maxDrawdown, expectedMaxDd);
    expect(metrics.sortino).toBe(0);
    expect(metrics.calmar).toBeCloseTo(calmar(monthlyReturns, 12));
  });

  it("calculates max drawdown indices and annualized return", () => {
    const returns = [0.2, -0.25, 0.1];
    const dd = maxDrawdown(returns);

    expect(dd.maxDrawdown).toBeCloseTo(-0.25);
    expect(dd.start).toBe(1);
    expect(dd.end).toBe(2);
    expect(cagr(returns, 3)).toBeCloseTo(Math.pow(1.2 * 0.75 * 1.1, 1 / 1) - 1);
  });
});

describe("portfolio metric helpers", () => {
  it("forward-fills gaps with the latest equity value", () => {
    const dateIndex = ["2024-01-01", "2024-01-02", "2024-01-03", "2024-01-04"];
    const curve = [
      { date: "2024-01-01", equity: 100 },
      { date: "2024-01-03", equity: 110 },
    ];

    const filled = forwardFillEquity(curve, dateIndex, 100);
    expect(filled).toEqual([
      { date: "2024-01-01", equity: 100 },
      { date: "2024-01-02", equity: 100 },
      { date: "2024-01-03", equity: 110 },
      { date: "2024-01-04", equity: 110 },
    ]);
  });

  it("builds a correlation matrix for ordered return series", () => {
    const series = {
      1: [0.01, 0.02, 0.03],
      2: [0.02, 0.01, 0.0],
      3: [-0.01, -0.02, -0.03],
    };

    const matrix = buildCorrelationMatrix(series, [1, 2, 3]);

    expect(matrix[0][0]).toBeCloseTo(1);
    expect(matrix[0][1]).toBeCloseTo(-1);
    expect(matrix[0][2]).toBeCloseTo(-1);
    expect(matrix[1][1]).toBeCloseTo(1);
    expect(matrix[1][2]).toBeCloseTo(1);
  });

  it("combines returns into an equal-weighted portfolio curve", () => {
    const dateIndex = buildDateIndex("2024-01-01", "2024-01-03");
    const returnsA = [0.01, 0, -0.01];
    const returnsB = [0.02, 0.01, 0];
    const combined = buildCombinedEquityFromReturns(dateIndex, [returnsA, returnsB], 100);

    expect(combined).toHaveLength(3);
    expect(combined[0].equity).toBeCloseTo(101.5);
    expect(combined[1].equity).toBeCloseTo(102.0075);
    expect(combined[2].equity).toBeCloseTo(101.4974625);
  });

  it("derives metric bundle with aligned daily returns", () => {
    const equityCurve = [
      { date: "2024-01-01", equity: 100000 },
      { date: "2024-01-02", equity: 101000 },
      { date: "2024-01-03", equity: 100500 },
    ];
    const trades = [
      { pnl: 1000, initialRisk: 500, holdingPeriodDays: 2 },
      { pnl: -500, initialRisk: 500, holdingPeriodDays: 1 },
    ];

    const returns = computeDailyReturnSeries(equityCurve);
    const expectedVol = volatility(returns) * Math.sqrt(252);
    const result = computeMetricBundle({ equityCurve, trades });

    expect(result.totalReturn).toBeCloseTo(0.5);
    expect(result.annualizedReturn).toBeGreaterThan(0);
    expect(result.volatility).toBeCloseTo(expectedVol * 100);
    expect(result.maxDrawdownPct).toBeLessThan(0);
    expect(result.winRate).toBeCloseTo(50);
    expect(result.expectancyPerTrade).toBeCloseTo(250);
    expect(result.avgHoldingPeriod).toBeCloseTo(1.5);
  });
});
