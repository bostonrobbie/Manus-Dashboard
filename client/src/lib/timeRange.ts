export type TimeRangePreset = "1M" | "3M" | "6M" | "YTD" | "1Y" | "ALL";

export interface TimeRange {
  preset: TimeRangePreset;
  startDate?: string;
  endDate?: string;
}

export const DEFAULT_TIME_RANGE: TimeRange = { preset: "ALL" };

