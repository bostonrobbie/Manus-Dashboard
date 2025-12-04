import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const detailMock = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useParams: () => ({ strategyId: "7" }),
  };
});

vi.mock("../../lib/trpc", () => ({
  trpc: {
    portfolio: {
      overview: { useQuery: vi.fn() },
      strategyDetail: {
        useQuery: (...args: unknown[]) => detailMock(...args),
      },
      compareStrategies: { useQuery: vi.fn() },
      strategyComparison: { useQuery: vi.fn() },
    },
  },
}));

import StrategyDetailPage from "../StrategyDetail";

const mockDetail = {
  strategy: { id: 7, name: "Test Strategy", description: "Desc", type: "intraday", symbol: "AAPL" },
  equityCurve: [
    { date: "2024-01-01", equity: 100000 },
    { date: "2024-01-02", equity: 101000 },
  ],
  drawdownCurve: [
    { date: "2024-01-01", drawdown: 0 },
    { date: "2024-01-02", drawdown: -1 },
  ],
  metrics: {
    totalReturn: 5,
    annualizedReturn: 6,
    volatility: 2,
    sharpe: 1.1,
    sortino: 1.2,
    calmar: 1.3,
    maxDrawdown: -2,
    winRate: 55,
    profitFactor: 1.6,
    totalTrades: 12,
    avgWin: 150,
    avgLoss: -90,
    avgHoldingPeriod: 3,
  },
  recentTrades: [
    {
      id: 1,
      symbol: "AAPL",
      side: "buy",
      quantity: 10,
      entryPrice: 100,
      exitPrice: 105,
      entryTime: "2024-01-01T10:00:00Z",
      exitTime: "2024-01-01T15:00:00Z",
      pnl: 50,
      pnlPercent: 5,
    },
  ],
  breakdown: {
    daily: 0.5,
    weekly: 1,
    monthly: 2,
    quarterly: 3,
    ytd: 5,
  },
};

describe("StrategyDetailPage", () => {
  beforeEach(() => {
    detailMock.mockReturnValue({ data: mockDetail, isLoading: false, isError: false });
  });

  afterEach(() => {
    detailMock.mockClear();
  });

  it("renders strategy header, metrics, and trades", () => {
    render(<StrategyDetailPage />);
    expect(detailMock).toHaveBeenCalledWith({ strategyId: 7, timeRange: "YTD", startingCapital: 100000 }, { enabled: true, retry: 1 });
    expect(screen.getByText(/Test Strategy/)).toBeInTheDocument();
    expect(screen.getByText(/Recent trades/)).toBeInTheDocument();
    expect(screen.getByText(/Performance breakdown/)).toBeInTheDocument();
  });

  it("shows an error message when the query fails", () => {
    detailMock.mockReturnValueOnce({ data: undefined, isLoading: false, isError: true });
    render(<StrategyDetailPage />);
    expect(screen.getByText(/Unable to load strategy details/)).toBeInTheDocument();
  });

  it("updates query params when controls change", async () => {
    const user = userEvent.setup();
    render(<StrategyDetailPage />);

    await user.click(screen.getByRole("button", { name: "1Y" }));
    const timeRangeCall = detailMock.mock.calls.at(-1);
    expect(timeRangeCall?.[0]).toMatchObject({ strategyId: 7, timeRange: "1Y", startingCapital: 100000 });

    const input = screen.getByLabelText(/Starting capital/i);
    await user.clear(input);
    await user.type(input, "150000");
    const capitalCall = detailMock.mock.calls.at(-1);
    expect(capitalCall?.[0]).toMatchObject({ strategyId: 7, timeRange: "1Y", startingCapital: 150000 });
  });
});
