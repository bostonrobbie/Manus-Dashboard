import "@testing-library/jest-dom";
import { vi } from "vitest";
import React from "react";

vi.mock("recharts", () => {
  const Mock = ({ children }: { children?: React.ReactNode }) => <div>{children}</div>;
  return {
    ResponsiveContainer: Mock,
    LineChart: Mock,
    AreaChart: Mock,
    BarChart: Mock,
    Line: Mock,
    Area: Mock,
    Bar: Mock,
    CartesianGrid: Mock,
    Tooltip: Mock,
    XAxis: Mock,
    YAxis: Mock,
    Legend: Mock,
  };
});
