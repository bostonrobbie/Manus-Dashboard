/**
 * Normalize equity curve to start at $0
 * This shows pure performance gains from the starting point
 */
export function normalizeEquityCurve<T extends { equity: number }>(
  data: T[]
): (T & { normalizedEquity: number })[] {
  if (data.length === 0) return [];

  const initialEquity = data[0].equity;

  return data.map(point => ({
    ...point,
    normalizedEquity: point.equity - initialEquity,
  }));
}

/**
 * Normalize multiple equity series to start at $0
 * Useful for comparing strategies on equal footing
 */
export function normalizeEquitySeries(series: {
  [key: string]: number[];
}): {
  [key: string]: number[];
} {
  const normalized: { [key: string]: number[] } = {};

  for (const [key, values] of Object.entries(series)) {
    if (values.length === 0) {
      normalized[key] = [];
      continue;
    }

    const initialValue = values[0];
    normalized[key] = values.map(v => v - initialValue);
  }

  return normalized;
}

/**
 * Format normalized equity for display
 * Shows as +$X or -$X
 */
export function formatNormalizedEquity(value: number): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}
