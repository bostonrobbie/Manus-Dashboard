import { render, screen } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import App from "../App";

vi.mock("../hooks/useAuthState", () => ({
  useAuthState: () => ({
    viewer: {
      user: { id: 1, email: "user@example.com", source: "local" as const },
      mode: "local" as const,
      mock: false,
      fallbackUsed: false,
      strict: false,
    },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
    errorReason: null,
  }),
}));

vi.mock("../components/DashboardLayout", () => ({
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="layout">{children}</div>,
}));

vi.mock("../providers/DashboardProvider", () => ({
  DashboardProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("../pages/HomeDashboardPage", () => ({ default: () => <div>Home Page</div> }));
vi.mock("../pages/Overview", () => ({ default: () => <div>Overview Page</div> }));
vi.mock("../pages/Strategies", () => ({ default: () => <div>Strategies Page</div> }));
vi.mock("../pages/StrategyDetail", () => ({ default: () => <div>Strategy Detail</div> }));
vi.mock("../pages/StrategyComparison", () => ({ default: () => <div>Compare Page</div> }));
vi.mock("../pages/VisualAnalytics", () => ({ default: () => <div>Visual Analytics</div> }));
vi.mock("../pages/Settings", () => ({ default: () => <div>Settings Page</div> }));

function renderAt(path: string) {
  window.history.pushState({}, "Test page", path);
  return render(<App />);
}

describe("App routing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the home dashboard by default", () => {
    renderAt("/");
    expect(screen.getByText(/Home Page/i)).toBeInTheDocument();
  });

  it("routes to strategies and compare", () => {
    renderAt("/strategies");
    expect(screen.getByText(/Strategies Page/i)).toBeInTheDocument();

    renderAt("/compare");
    expect(screen.getByText(/Compare Page/i)).toBeInTheDocument();
  });

  it("routes to visual analytics", () => {
    renderAt("/analytics");
    expect(screen.getByText(/Visual Analytics/i)).toBeInTheDocument();
  });
});
