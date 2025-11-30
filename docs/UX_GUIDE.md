# UX Guide

## Terminology
- Use consistent nouns: **Workspace**, **Strategy**, **Trades**, **Benchmarks**, **Uploads**, **Admin Data Manager**, **Settings/Health**.
- Refer to the data scope as "workspace" (avoid "portfolio" in UI copy).

## KPI ordering
Use this canonical order wherever metrics appear:
1. Total Return
2. Max Drawdown
3. Sharpe
4. Sortino (helper text when available)
5. Profit Factor
6. Expectancy
7. Win rate
8. Trade count

## Date and time formats
- Dates: ISO-like `YYYY-MM-DD`; timestamps rendered in the browser locale.
- Show ranges as `start → end` with explicit timezone when provided by the API.

## Chart colors
- Equity: deep slate/indigo for workspace equity, blue for benchmarks.
- Drawdown: orange fill/line for drawdowns.
- Histograms: slate bars for counts; avoid multi-hue palettes unless comparing categories.

## Empty states and errors
- Keep messages short and factual, e.g., "No uploads yet" or "Failed to load strategies".
- Avoid blame; suggest the next action when possible ("Upload trades for this workspace").

## Page narratives
- **Overview**: "What is this workspace doing overall." Snapshots and equity/drawdown context.
- **Strategies**: "Which edges are working." Comparisons across strategies and detail drill-down.
- **Trades**: "What exactly happened, trade by trade." Filters, blotter, and distribution.
- **Uploads/Admin Data**: "How to curate and inspect the dataset." Upload logs and admin curation.
- **Settings/Health**: "System configuration and status for operators."
