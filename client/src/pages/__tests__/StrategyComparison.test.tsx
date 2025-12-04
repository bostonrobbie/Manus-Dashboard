import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const strategyListMock = vi.fn();
const compareMock = vi.fn();

vi.mock("../../lib/trpc", () => ({
  trpc: {
    portfolio: {
      overview: { useQuery: vi.fn() },
      strategyDetail: { useQuery: vi.fn() },
      compareStrategies: {
        useQuery: (...args: unknown[]) => compareMock(...args),
      },
      strategyComparison: {
        useQuery: (...args: unknown[]) => strategyListMock(...args),
      },
    },
  },
}));

import StrategyComparisonPage from "../StrategyComparison";

const listResponse = {
  rows: [
    { strategyId: 1, name: "Alpha", type: "intraday" },
    { strategyId: 2, name: "Beta", type: "swing" },
    { strategyId: 3, name: "Gamma", type: "intraday" },
  ],
};

const comparisonResponse = {
  individualCurves: {
    1: [
      { date: "2024-01-01", equity: 100000 },
      { date: "2024-01-02", equity: 101000 },
    ],
    2: [
      { date: "2024-01-01", equity: 100000 },
      { date: "2024-01-02", equity: 100500 },
    ],
  },
  combinedCurve: [
    { date: "2024-01-01", equity: 100000 },
    { date: "2024-01-02", equity: 100750 },
  ],
  correlationMatrix: { strategyIds: [1, 2], matrix: [[1, 0.5], [0.5, 1]] },
  combinedMetrics: {
    totalReturn: 5,
    annualizedReturn: 6,
    volatility: 3,
    sharpe: 1.1,
    sortino: 1.2,
    calmar: 1.3,
    maxDrawdown: -2,
    winRate: 55,
    profitFactor: 1.5,
  },
  individualMetrics: {
    1: { totalReturn: 6, sharpe: 1.2, maxDrawdown: -2 },
    2: { totalReturn: 4, sharpe: 1.0, maxDrawdown: -1.5 },
  },
};

describe("StrategyComparisonPage", () => {
  beforeEach(() => {
    strategyListMock.mockReturnValue({ data: listResponse, isLoading: false, isError: false });
    compareMock.mockReturnValue({ data: undefined, isLoading: false, isError: false });
  });

  afterEach(() => {
    strategyListMock.mockClear();
    compareMock.mockClear();
  });

  it("blocks comparison until at least two strategies are selected", async () => {
    render(<StrategyComparisonPage />);
    expect(strategyListMock).toHaveBeenCalled();
    const helper = screen.getByText(/Select at least 2 strategies/i);
    expect(helper).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /Alpha/i }));
    const firstCall = compareMock.mock.calls.at(-1);
    expect(firstCall?.[1]).toMatchObject({ enabled: false, retry: 1 });

    compareMock.mockReturnValue({ data: comparisonResponse, isLoading: false, isError: false });
    await user.click(screen.getByRole("button", { name: /Beta/i }));
    const lastCall = compareMock.mock.calls.at(-1);
    expect(lastCall?.[0]).toMatchObject({ strategyIds: [1, 2], timeRange: "YTD", startingCapital: 100000 });
  });
});
