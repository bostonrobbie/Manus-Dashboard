import { TimeRange } from "@shared/types/portfolio";

export const TIME_RANGE_PRESETS = ["1M", "3M", "6M", "YTD", "1Y", "3Y", "5Y", "ALL"] as const;

const toIsoDate = (date: Date) => date.toISOString().slice(0, 10);

export function deriveDateRangeFromTimeRange(timeRange?: TimeRange): {
  startDate?: string;
  endDate?: string;
} {
  if (!timeRange || timeRange.preset === "ALL") return {};

  const today = new Date();
  const endDate = timeRange.endDate ?? toIsoDate(today);

  if (timeRange.startDate) {
    const clampedStart = timeRange.startDate > endDate ? endDate : timeRange.startDate;
    return { startDate: clampedStart, endDate };
  }

  const start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));

  switch (timeRange.preset) {
    case "1M":
      start.setUTCMonth(start.getUTCMonth() - 1);
      break;
    case "3M":
      start.setUTCMonth(start.getUTCMonth() - 3);
      break;
    case "6M":
      start.setUTCMonth(start.getUTCMonth() - 6);
      break;
    case "YTD":
      start.setUTCMonth(0, 1);
      break;
    case "1Y":
      start.setUTCFullYear(start.getUTCFullYear() - 1);
      break;
    case "3Y":
      start.setUTCFullYear(start.getUTCFullYear() - 3);
      break;
    case "5Y":
      start.setUTCFullYear(start.getUTCFullYear() - 5);
      break;
    default:
      break;
  }

  return { startDate: toIsoDate(start), endDate };
}

