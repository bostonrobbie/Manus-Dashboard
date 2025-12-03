# Architecture

Manus (Google sign-in) → Manus headers → Manus-Dashboard backend (auth context, routers, services) → PostgreSQL → React client via tRPC.

## Auth and RBAC
- Manus injects `MANUS_USER_HEADER` (default `x-manus-user-json`) and `MANUS_WORKSPACE_HEADER` (`x-manus-workspace-id`) with serialized user + workspace info; optional role/org headers are honored when present.
- The backend parses headers into `AuthUser`, resolves workspace membership/ownership, and applies RBAC in routers (portfolio, uploads) and Admin Data Manager paths. `viewer` is read-only; `editor`/`admin`/`owner` can mutate workspace data.

## Data Ingestion Pipeline
- CSV upload starts in the Uploads page, sending content to `portfolio.uploadTradesCsv` or `portfolio.uploadBenchmarksCsv`.
- The server logs an `upload_logs` row, validates headers, dedupes via `(workspace_id, external_id | natural_key)`, inserts trades/benchmarks, and records audit entries. Partial imports capture warning/error summaries.
- Demo data and seeding scripts live under `scripts/` and `server/scripts/` for local smoke tests.

## Analytics Engine
- `server/engine/metrics.ts` and `server/portfolio-engine.ts` compute analytics, drawdowns, edge analytics, and risk guidance.
- Results are serialized using shared types in `shared/types/portfolio.ts` and returned through tRPC for charts and KPI strips.

## API Layer
- Primary routers: `portfolio` (overview, equity curves, strategy comparison, trades, exports), `uploads` (audit listings), `adminData` (soft deletes, workspace inventory), `auth` (debug), `health`, and `version`. Comparison/report responses reuse shared portfolio types.
- tRPC clients in the React app share inputs/outputs through `shared/types`, keeping client and server in sync.

## Frontend
- Pages: Overview, Strategies, Trades, Uploads, Settings/Health, Admin Data Manager, plus comparison/reporting widgets.
- `DashboardProvider` holds global workspace + time range context consumed by page hooks. Charting uses Recharts with a thin wrapper for equity, drawdown, and histogram views.

## QA and Tooling
- Core commands: `pnpm lint`, `pnpm typecheck`, `pnpm test:all` (includes client/server builds and unit tests).
- Additional coverage via property tests under `server/tests`, stress helper in `server/scripts/stress-queries.ts`, and Playwright navigation smoke tests in `e2e/`.
- Health endpoints `/health` and `/health/full` support Manus readiness probes; `/version` surfaces version + commit metadata.
