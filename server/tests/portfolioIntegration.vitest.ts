import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { setTestDb } from "@server/db";
import { portfolioRouter } from "@server/routers/portfolio";
import { handleTradingViewWebhook } from "@server/routers/webhooks";

const user = { id: 1, email: "test@example.com", source: "local" as const };
const baseCtx = { user, auth: { mode: "local" as const, user, mock: true } } as any;

const createPortfolioCaller = () => portfolioRouter.createCaller(baseCtx);

const createMockRes = () => {
  const res: any = { statusCode: 200, jsonPayload: null };
  res.status = (code: number) => {
    res.statusCode = code;
    return res;
  };
  res.json = (payload: any) => {
    res.jsonPayload = payload;
    return res;
  };
  return res;
};

describe("portfolio integration", () => {
  beforeEach(() => {
    setTestDb(null);
  });

  it("returns overview data with aligned curves and metrics", async () => {
    const caller = createPortfolioCaller();
    const result = await caller.overview({ timeRange: "ALL", startingCapital: 100000 });

    expect(result.equityCurve.length).toBeGreaterThan(0);
    expect(result.drawdownCurve).toHaveLength(result.equityCurve.length);
    expect(result.metrics.portfolio).toMatchObject({
      totalReturn: expect.any(Number),
      annualizedReturn: expect.any(Number),
      volatility: expect.any(Number),
    });
    expect(result.breakdown.daily.portfolio).toBeTypeOf("number");
  });

  it("loads strategy detail metrics and trades", async () => {
    const caller = createPortfolioCaller();
    const detail = await caller.strategyDetail({ strategyId: 1, timeRange: "ALL", startingCapital: 100000 });

    expect(detail.strategy.id).toBe(1);
    expect(detail.equityCurve.length).toBeGreaterThan(0);
    expect(detail.drawdownCurve).toHaveLength(detail.equityCurve.length);
    expect(detail.metrics.totalReturn).toBeTypeOf("number");
    expect(detail.recentTrades.length).toBeGreaterThan(0);
  });

  it("compares strategies with combined curve and correlation matrix", async () => {
    const caller = createPortfolioCaller();
    const comparison = await caller.compareStrategies({
      strategyIds: [1, 2],
      timeRange: "ALL",
      startingCapital: 100000,
    });

    expect(Object.keys(comparison.individualCurves)).toHaveLength(2);
    const firstCurve = comparison.individualCurves["1"];
    expect(comparison.combinedCurve.length).toBe(firstCurve.length);
    expect(comparison.correlationMatrix.matrix.length).toBe(2);
    expect(comparison.combinedMetrics.totalReturn).toBeTypeOf("number");
  });
});

describe("tradingview webhook", () => {
  const originalSecret = process.env.TRADINGVIEW_WEBHOOK_SECRET;

  beforeEach(() => {
    process.env.TRADINGVIEW_WEBHOOK_SECRET = "secret";
    vi.restoreAllMocks();
  });

  afterEach(() => {
    process.env.TRADINGVIEW_WEBHOOK_SECRET = originalSecret;
  });

  it("rejects requests with an invalid secret", async () => {
    const req: any = { body: {}, headers: {} };
    const res = createMockRes();

    await handleTradingViewWebhook(req, res as any);
    expect(res.statusCode).toBe(403);
    expect(res.jsonPayload?.success).toBe(false);
  });

  it("returns 503 when database is unavailable", async () => {
    const req: any = {
      body: {
        symbol: "AAPL",
        side: "long",
        action: "entry",
        quantity: 10,
        price: 100,
        entryTime: "2024-01-01T00:00:00.000Z",
        exitTime: "2024-01-02T00:00:00.000Z",
      },
      headers: { "x-webhook-secret": "secret" },
    };
    const res = createMockRes();

    await handleTradingViewWebhook(req, res as any);
    expect(res.statusCode).toBe(503);
    expect(res.jsonPayload).toMatchObject({ success: false });
  });

});
