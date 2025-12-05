# Equity Curve Scaling Issue Analysis

## Observed Problems

Looking at the screenshot of the Overview page equity curve:

1. **Chart doesn't extend to right edge** - There's visible white/empty space on the right side of the chart area
2. **Data appears to end early** - The blue portfolio line and gray S&P 500 line both stop before reaching the right edge
3. **X-axis labels** - The last visible date label appears to be around "10/1/25" but the time range is "1 Year" (Dec 2024 to Dec 2025)

## Potential Root Causes

### 1. Forward-Fill Logic Issue
The `forwardFillEquityCurve` function may not be extending the equity curve all the way to `endDate`. 

**Check:** Does the forward-fill stop at the last trade date instead of extending to the selected end date?

### 2. Chart Domain Calculation
The Recharts `XAxis` domain might be incorrectly calculated, leaving padding on the right side.

**Current code likely has:**
```tsx
<XAxis 
  dataKey="date"
  domain={['dataMin', 'dataMax']} // This might not extend to the full time range
/>
```

**Should be:**
```tsx
<XAxis 
  dataKey="date"
  domain={[startDate.getTime(), endDate.getTime()]} // Explicit time range
/>
```

### 3. Data Point Gaps
If the last trade is several days/weeks before the end date, and forward-fill isn't working, the chart will stop early.

## Investigation Steps

1. Check the actual data returned by `trpc.portfolio.overview.useQuery()`
   - How many data points in `portfolioEquity`?
   - What is the last date in the array?
   - Does it match the selected end date?

2. Check the `forwardFillEquityCurve` function in `server/analytics.ts`
   - Does it correctly extend to `endDate`?
   - Is it being called with the correct parameters?

3. Check the chart component in `client/src/pages/Overview.tsx`
   - Is the XAxis domain set correctly?
   - Are there any filters removing recent data points?

## Next Steps

1. Add logging to see the actual equity curve data points
2. Fix forward-fill logic if needed
3. Fix chart domain to use explicit date range
4. Add tests to verify equity curve extends to end date for all time ranges
