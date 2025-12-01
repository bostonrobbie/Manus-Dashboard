# Home dashboard upgrade notes

This iteration tightens observability on the home dashboard by adding explicit error handling, client-side logging hooks, and owner-scoped API access so multi-tenant data stays isolated.

## Client logging
- The new `client/src/lib/clientLogger.ts` exports `logClientError(source, error, extra?)`.
- The logger currently writes to `console.error` with a normalized payload to keep failures visible during debugging.
- Future iterations can post the payload to a backend `/client-log` endpoint if available.

## Home dashboard error handling
- `HomeDashboardPage` now renders a clear retry card when any of the core tRPC queries fail.
- Errors are logged via `logClientError` with sources `HomeDashboard.getOverview` and `HomeDashboard.getStrategySummaries` so we can trace failing calls in the browser console.
- The retry button refetches overview and strategy summary queries together to keep the view consistent.

## Backend endpoints
- `portfolio.getOverview`: returns normalized portfolio equity (base 10,000), `todayPnl`, `mtdPnl`, `ytdPnl`, `maxDrawdown`, `openRisk`/`accountValue` (nullable), and `dataHealth` (hasTrades + first/last trade dates). Empty workspaces return zeroed PnL, empty equity arrays, and `hasTrades=false`.
- `portfolio.getStrategySummaries`: per-strategy normalized equity curves plus stats `{ sharpe, maxDrawdown, winRate, tradeCount, startDate, endDate }`. Strategies without trades return empty curves and zero/nullable stats instead of throwing.
- `system.status`: lightweight health probe returning `{ db: "ok" | "error", portfolioOverview: "ok" | "error", timestamp }` based on a trivial DB query and a short portfolio probe.
- All portfolio endpoints require authentication and scope database queries by `ownerId = ctx.user.id`; admin-only routes enforce `role` of OWNER/ADMIN.

### Response shapes
- `portfolio.getOverview`
  - `portfolioEquity: { date: string; equity: number }[]`
  - `todayPnl`, `mtdPnl`, `ytdPnl`, `maxDrawdown` (numbers), `openRisk: number | null`, `accountValue: number | null`
  - `dataHealth: { hasTrades: boolean; firstTradeDate: string | null; lastTradeDate: string | null }`
- `portfolio.getStrategySummaries`
  - Array of `{ strategyId: string; name: string; instrument: string | null; equityCurve: { date: string; equity: number }[]; stats: { sharpe: number | null; maxDrawdown: number; winRate: number | null; tradeCount: number; startDate: string | null; endDate: string | null } }`
- `system.status`
  - `{ db: "ok" | "error"; portfolioOverview: "ok" | "error"; timestamp: string }`

## QA matrix
- **Network interruption:** Simulate offline mode; the dashboard surfaces the retry card and logs the failure.
- **Partial data load:** If one query fails while others succeed, the page still shows the retry card and does not attempt to render partial UI.
- **Recovered service:** After the API is reachable again, clicking retry rehydrates the dashboard without a full page reload.
- **No trades:** With an empty workspace, `portfolio.getOverview` returns zeros/empty arrays and the UI shows the empty state text rather than blank charts.
- **Some trades:** Using sample data, verify today/MTD/YTD P&L update and strategy summaries render curves/stats.
- **Intentional failure:** Temporarily mock `buildPortfolioOverview` to throw; `system.status` should mark `portfolioOverview: "error"` and the Home dashboard should log via `clientLogger` and show the retry card.
