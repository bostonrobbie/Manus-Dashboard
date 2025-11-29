import { useState } from "react";

import { DEFAULT_TIME_RANGE, TimeRange, TimeRangePreset } from "../lib/timeRange";

export function useTimeRange(initialRange: TimeRange = DEFAULT_TIME_RANGE) {
  const [timeRange, setTimeRange] = useState<TimeRange>(initialRange);

  const setPreset = (preset: TimeRangePreset) => setTimeRange({ preset });

  return { timeRange, setTimeRange, setPreset } as const;
}

