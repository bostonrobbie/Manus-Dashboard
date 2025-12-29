# Equity Chart Bug Analysis

## Issue

User reports: When entering $25K as starting capital for micros, the equity chart shows $2K instead.

## Current Behavior

- The starting capital input is at 100000 (default)
- The Y-axis shows values from $0k to $1400k
- The chart starts near $100k and ends around $1.2M (showing ~1120% return)

## Analysis

Looking at the code:

1. **Backend (routers.ts:2496-2499)**: `calculateEquityCurve` is called with `startingCapital` parameter
2. **Analytics (analytics.ts:98-134)**: `calculateEquityCurve` correctly:
   - Sets initial equity to `startingCapital`
   - Adds starting point with `equity: startingCapital`
   - Adds P&L in dollars (pnl/100) to equity

3. **Frontend (UserDashboard.tsx:255-330)**: `combinedChartData` useMemo:
   - Uses `portfolioData.equityCurve` directly for `combined` value
   - The equity values come from backend already calculated

## Root Cause Investigation

The issue appears to be that when the user changes `startingCapital`:

1. The tRPC query should refetch with new `startingCapital`
2. But the chart Y-axis scale doesn't seem to update properly

Looking at the chart with 100k starting capital:

- Y-axis: $0k, $350k, $700k, $1050k, $1400k
- This suggests the chart is showing absolute dollar values

If user enters 25k, the chart should show:

- Starting at $25k
- Ending at ~$305k (25k \* 12.2 = $305k for 1120% return)

But user reports seeing $2k which suggests either:

1. The Y-axis scale isn't updating
2. The data isn't being refetched with new startingCapital
3. There's a calculation error somewhere

## Next Steps

1. Check if tRPC query refetches when startingCapital changes
2. Verify the equity curve data contains correct starting values
3. Check if the chart domain is being set correctly
