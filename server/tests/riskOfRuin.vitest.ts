import { describe, expect, it } from "vitest";

import { computeRiskOfRuin } from "@server/engine/riskOfRuin";

describe("risk of ruin", () => {
  it("returns low ruin when edge is positive and risk is small", () => {
    const result = computeRiskOfRuin({
      winRate: 0.55,
      avgWin: 200,
      avgLoss: 150,
      riskPerTradePct: 0.01,
      startingEquity: 50_000,
    });

    expect(result.riskOfRuinFraction).toBeGreaterThanOrEqual(0);
    expect(result.riskOfRuinFraction).toBeLessThan(1);
    expect(result.breakEvenWinRate).toBeCloseTo(150 / (150 + 200));
  });

  it("caps outputs when inputs are missing", () => {
    const result = computeRiskOfRuin({ winRate: NaN as any, avgWin: 0, avgLoss: 0, riskPerTradePct: 0, startingEquity: 0 });
    expect(result.riskOfRuinFraction).toBe(1);
    expect(result.riskUnits).toBe(0);
    expect(result.breakEvenWinRate).toBe(0);
  });
});
