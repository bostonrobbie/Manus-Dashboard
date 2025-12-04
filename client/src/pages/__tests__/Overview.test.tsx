import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import OverviewPage from "../Overview";
import React from "react";

const overviewMock = vi.fn();

vi.mock("../../lib/trpc", () => ({
  trpc: {
    portfolio: {
      overview: {
        useQuery: (...args: unknown[]) => overviewMock(...args),
      },
      strategyDetail: { useQuery: vi.fn() },
      compareStrategies: { useQuery: vi.fn() },
      strategyComparison: { useQuery: vi.fn() },
    },
  },
}));

const mockOverview = {
  equityCurve: [
    { date: "2024-01-01", portfolio: 100000, spy: 100000 },
    { date: "2024-01-02", portfolio: 101000, spy: 100500 },
  ],
  drawdownCurve: [
    { date: "2024-01-01", portfolio: 0, spy: 0 },
    { date: "2024-01-02", portfolio: -1, spy: -0.5 },
  ],
  metrics: {
    portfolio: {
      totalReturn: 5,
      annualizedReturn: 6,
      volatility: 3,
      sharpe: 1.2,
      sortino: 1.4,
      calmar: 1.1,
      maxDrawdown: -2,
      winRate: 55,
      profitFactor: 1.8,
      totalTrades: 10,
      avgWin: 200,
      avgLoss: -100,
    },
    spy: {
      totalReturn: 4,
      annualizedReturn: 5,
      volatility: 2,
      sharpe: 1.1,
      sortino: 1.2,
      calmar: 1,
      maxDrawdown: -1.5,
      winRate: 52,
      profitFactor: 1.6,
      totalTrades: 9,
      avgWin: 180,
      avgLoss: -90,
    },
  },
  breakdown: {
    daily: { portfolio: 0.5, spy: 0.3 },
    weekly: { portfolio: 1, spy: 0.8 },
    monthly: { portfolio: 2, spy: 1.7 },
    quarterly: { portfolio: 3, spy: 2.5 },
    ytd: { portfolio: 5, spy: 4 },
  },
};

describe("OverviewPage", () => {
  beforeEach(() => {
    overviewMock.mockReturnValue({ data: mockOverview, isLoading: false, isError: false });
  });

  afterEach(() => {
    overviewMock.mockClear();
  });

  it("requests overview data for selected time range", async () => {
    render(<OverviewPage />);
    expect(overviewMock).toHaveBeenCalledWith({ timeRange: "YTD", startingCapital: 100000 }, { retry: 1 });

    await userEvent.click(screen.getByRole("button", { name: "3Y" }));

    const lastCall = overviewMock.mock.calls.at(-1);
    expect(lastCall?.[0]).toMatchObject({ timeRange: "3Y", startingCapital: 100000 });
  });

  it("renders metrics and breakdown rows", () => {
    render(<OverviewPage />);
    expect(screen.getByText(/portfolio overview/i)).toBeInTheDocument();
    expect(screen.getByText(/Performance breakdown/i)).toBeInTheDocument();
    expect(screen.getByText("Daily")).toBeInTheDocument();
    expect(screen.getByText(/Total return/i)).toBeInTheDocument();
  });
});
