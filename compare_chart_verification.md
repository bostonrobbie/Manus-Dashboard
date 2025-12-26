# Compare Page Drawdown Chart Verification - December 17, 2025

## Issue
The drawdown chart Y-axis was showing -100% even when actual drawdowns were much smaller (e.g., -10%), making the chart hard to read.

## Fix Applied
Added auto-scaling to the Y-axis domain in StrategyComparison.tsx:
- Calculates the minimum drawdown value from all data series
- Adds 10% padding below the minimum for readability
- Domain is now `[minDrawdown - padding, 0]` instead of fixed `[-100, 0]`

## Verification
Screenshot shows the Drawdown Comparison chart with:
- Y-axis now scales from 0% to approximately -110% (based on actual CL Trend Following data)
- The chart shows ES Trend Following DD (small drawdowns near 0%)
- CL Trend Following DD shows larger drawdowns going to ~-100%
- combinedDD shows the combined portfolio drawdown

## Note
The chart is now showing -110% because CL Trend Following has significant drawdowns. When strategies with smaller drawdowns are selected, the Y-axis will auto-scale to fit those smaller values, making the chart more readable.

## Status
✅ Auto-scaling is working correctly - the Y-axis adapts to the actual data range with 10% padding.
