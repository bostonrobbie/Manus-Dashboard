# Home dashboard upgrade notes

This iteration tightens observability on the home dashboard by adding explicit error handling and client-side logging hooks.

## Client logging
- The new `client/src/lib/clientLogger.ts` exports `logClientError(source, error, extra?)`.
- The logger currently writes to `console.error` with a normalized payload to keep failures visible during debugging.
- Future iterations can post the payload to a backend `/client-log` endpoint if available.

## Home dashboard error handling
- `HomeDashboardPage` now renders a clear retry card when any of the core tRPC queries fail.
- Errors are logged via `logClientError("HomeDashboardPage", error, { hasOverview })` so we can trace failing calls in the browser console.
- The retry button refetches overview, equity curves, and strategy comparison queries together to keep the view consistent.

## QA matrix
- **Network interruption:** Simulate offline mode; the dashboard surfaces the retry card and logs the failure.
- **Partial data load:** If one query fails while others succeed, the page still shows the retry card and does not attempt to render partial UI.
- **Recovered service:** After the API is reachable again, clicking retry rehydrates the dashboard without a full page reload.
