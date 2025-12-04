import type { Page } from "@playwright/test";

const viewerFixture = {
  user: { id: 1, email: "e2e@local.test", name: "E2E", roles: ["admin"], role: "admin", source: "local" },
  mode: "local",
  mock: true,
  fallbackUsed: false,
  strict: false,
};

const overviewFixture = {
  equityCurve: [
    { date: "2024-01-01", portfolio: 100000, spy: 100000 },
    { date: "2024-02-01", portfolio: 103500, spy: 101000 },
    { date: "2024-03-01", portfolio: 106000, spy: 102250 },
  ],
  drawdownCurve: [
    { date: "2024-01-01", portfolio: 0, spy: 0 },
    { date: "2024-02-01", portfolio: -2.5, spy: -1 },
    { date: "2024-03-01", portfolio: 1.5, spy: 0.5 },
  ],
  metrics: {
    portfolio: {
      totalReturn: 0.12,
      annualizedReturn: 0.1,
      volatility: 0.04,
      sharpe: 1.4,
      sortino: 1.6,
      calmar: 1.2,
      maxDrawdown: -0.08,
      winRate: 0.62,
      profitFactor: 1.55,
      totalTrades: 120,
      avgWin: 3500,
      avgLoss: -1800,
    },
    spy: {
      totalReturn: 0.07,
      annualizedReturn: 0.06,
      volatility: 0.03,
      sharpe: 1.1,
      sortino: 1.2,
      calmar: 0.9,
      maxDrawdown: -0.1,
      winRate: 0.55,
      profitFactor: 1.2,
      totalTrades: 0,
      avgWin: 0,
      avgLoss: 0,
    },
  },
  breakdown: {
    daily: { portfolio: 0.02, spy: 0.01 },
    weekly: { portfolio: 0.03, spy: 0.015 },
    monthly: { portfolio: 0.05, spy: 0.02 },
    quarterly: { portfolio: 0.08, spy: 0.03 },
    ytd: { portfolio: 0.12, spy: 0.07 },
  },
};

const strategyList = [
  { strategyId: 1, name: "Momentum Alpha", type: "intraday" },
  { strategyId: 2, name: "Reversion Beta", type: "swing" },
];

const strategyDetailFixture = {
  strategy: { id: 1, name: "Momentum Alpha", description: "Mock strategy", type: "intraday", symbol: "AAPL" },
  equityCurve: [
    { date: "2024-01-01", equity: 100000 },
    { date: "2024-02-01", equity: 104000 },
    { date: "2024-03-01", equity: 107500 },
  ],
  drawdownCurve: [
    { date: "2024-01-01", drawdown: 0 },
    { date: "2024-02-01", drawdown: -3 },
    { date: "2024-03-01", drawdown: 1 },
  ],
  metrics: {
    totalReturn: 0.15,
    annualizedReturn: 0.12,
    volatility: 0.05,
    sharpe: 1.5,
    sortino: 1.7,
    calmar: 1.3,
    maxDrawdown: -0.09,
    winRate: 0.6,
    profitFactor: 1.6,
    totalTrades: 80,
    avgWin: 2500,
    avgLoss: -1400,
    avgHoldingPeriod: 3.2,
  },
  recentTrades: [
    {
      id: 1,
      symbol: "AAPL",
      side: "buy",
      quantity: 10,
      entryPrice: 150,
      exitPrice: 158,
      entryTime: "2024-02-01T10:00:00Z",
      exitTime: "2024-02-03T10:00:00Z",
      pnl: 80,
      holdingPeriodDays: 2,
    },
  ],
  breakdown: {
    daily: 0.01,
    weekly: 0.02,
    monthly: 0.03,
    quarterly: 0.05,
    ytd: 0.1,
  },
};

const comparisonFixture = {
  combinedCurve: [
    { date: "2024-01-01", equity: 100000 },
    { date: "2024-02-01", equity: 103000 },
    { date: "2024-03-01", equity: 106500 },
  ],
  individualCurves: {
    "1": [
      { date: "2024-01-01", equity: 100000 },
      { date: "2024-02-01", equity: 102000 },
      { date: "2024-03-01", equity: 104500 },
    ],
    "2": [
      { date: "2024-01-01", equity: 100000 },
      { date: "2024-02-01", equity: 104000 },
      { date: "2024-03-01", equity: 108000 },
    ],
  },
  combinedMetrics: {
    totalReturn: 0.1,
    annualizedReturn: 0.08,
    volatility: 0.04,
    sharpe: 1.2,
    sortino: 1.3,
    calmar: 1.1,
    maxDrawdown: -0.07,
    winRate: 0.6,
    profitFactor: 1.4,
  },
  individualMetrics: {
    "1": { totalReturn: 0.08, annualizedReturn: 0.07, volatility: 0.04, sharpe: 1.1, sortino: 1.2, calmar: 1, maxDrawdown: -0.08, winRate: 0.58, profitFactor: 1.3 },
    "2": { totalReturn: 0.12, annualizedReturn: 0.09, volatility: 0.05, sharpe: 1.2, sortino: 1.3, calmar: 1.1, maxDrawdown: -0.06, winRate: 0.61, profitFactor: 1.45 },
  },
  correlationMatrix: { strategyIds: [1, 2], matrix: [[1, 0.2], [0.2, 1]] },
};

function responseForProcedure(name: string) {
  switch (name) {
    case "auth.viewer":
      return viewerFixture;
    case "portfolio.overview":
    case "portfolio.getOverview":
      return overviewFixture;
    case "portfolio.strategyDetail":
      return strategyDetailFixture;
    case "portfolio.strategyComparison":
      return { rows: strategyList, page: 1, pageSize: 50, total: strategyList.length };
    case "portfolio.compareStrategies":
      return comparisonFixture;
    case "portfolio.getStrategySummaries":
      return { rows: strategyList, total: strategyList.length, page: 1, pageSize: strategyList.length };
    case "analytics.getPortfolioStatus":
      return { status: "ok" };
    case "uploads.list":
    case "adminData.listUploads":
      return { rows: [], total: 0, page: 1, pageSize: 20 };
    default:
      if (name.startsWith("portfolio.")) {
        return { rows: [], total: 0 };
      }
      return {};
  }
}

export async function setupLocalApiMocks(page: Page) {
  await page.route("**/trpc/**", async route => {
    const url = new URL(route.request().url());
    const path = url.pathname.split("/trpc/")[1] ?? "";
    const procedures = path.split(",").filter(Boolean);
    if (procedures.length === 0) return route.continue();

    const results = procedures.map(name => ({ result: { data: { json: responseForProcedure(name) } } }));
    const body = procedures.length === 1 ? results[0] : results;

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(body),
    });
  });
}
