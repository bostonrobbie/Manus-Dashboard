# External AI Integration

This guide explains how external agents (Manus-hosted, Antigravity, or local tools) can connect to the Manus Dashboard database and run migrations/tests using only repository assets plus environment variables.

## Quick start
1. Set the Postgres connection string (for Drizzle/Node) in `DATABASE_URL`.
2. (Optional) Toggle Manus mode with `MANUS_MODE=true` and provide Manus header names when running behind Manus gateways:
   - `MANUS_AUTH_HEADER_USER` (default `x-manus-user-json`)
   - `MANUS_AUTH_HEADER_WORKSPACE` (default `x-manus-workspace-id`)
3. Install dependencies and run migrations from the repo root:
   ```bash
   pnpm install
   pnpm migrate
   ```
4. Seed demo data for a single workspace:
   ```bash
   pnpm db:seed:demo
   ```

Run linting and type checks from the repo root before submitting changes:

```bash
pnpm lint
pnpm typecheck
pnpm test:all
```

## Minimal environment variables
- `DATABASE_URL` – Postgres connection string (required for any DB interaction)
- `MANUS_MODE` – `true` to enforce Manus headers/auth, `false` for local dev
- `MOCK_USER_ENABLED` – allow mock user fallback locally (default `true`)
- `MANUS_AUTH_HEADER_USER` / `MANUS_AUTH_HEADER_WORKSPACE` – header names to read from the proxy

## Schema pointers
- Schema & tables: `drizzle/schema.ts`
- Migrations: `drizzle/migrations/`
- Upload log audit trail: `upload_logs` table (enum `upload_type` contains `trades`, `benchmarks`, `equity`)

## Running migrations
Use the provided Drizzle script (wraps `drizzle-kit`):
```bash
pnpm migrate
# or from the server package
pnpm --filter server migrate
```

## Running tests
Backend tests (Node test runner + ts-node):
```bash
pnpm --filter server test
```

## Seeding demo data
A simple seed script lives at `server/scripts/seed-demo-data.ts` and loads one workspace with example strategies, trades, and benchmark rows. Run it after migrations with:
```bash
pnpm db:seed:demo
```

For load testing or performance sanity checks, you can generate a larger synthetic workspace (~100k trades + benchmarks) with:
```bash
pnpm db:seed:large
```
This leverages the ingestion pipeline and logs `LOAD_DATASET_*` events with basic timing metrics. Adjust `LOAD_TRADE_COUNT`, `WORKSPACE_ID`, or `USER_ID` env vars to tune the run. It is optional and intended for performance profiling, not routine setup.

## Read-only analysis for agents
- Agents can connect to Postgres using `DATABASE_URL` in read-only mode (e.g., `postgres://user:password@host:5432/db?sslmode=require&options=...`).
- The most relevant tables for analytics are `workspaces`, `strategies`, `trades`, `benchmarks`, and `upload_logs`.
- Soft deletes are tracked via `deleted_at` columns (trades/benchmarks). Filter on `deleted_at IS NULL` to ignore removed rows.

## Local dev safety rails
- Health checks live at `/health` and `/health/full` to ensure DB + Manus headers are wired.
- Mock mode (`MOCK_USER_ENABLED=true`) injects a deterministic user/workspace for offline use.
- All ingestion and admin routes expect `workspaceId` to be present; ensure your headers or mock mode provide it.

## Logging events
- Ingestion emits `INGEST_TRADES_START` / `INGEST_TRADES_END` / `INGEST_TRADES_FAILED` and `INGEST_BENCHMARKS_START` / `INGEST_BENCHMARKS_END` / `INGEST_BENCHMARKS_FAILED` with `workspaceId`, `userId`, and upload identifiers.
- Admin operations emit `ADMIN_SOFT_DELETE_UPLOAD`, `ADMIN_SOFT_DELETE_TRADES`, and `ADMIN_SOFT_DELETE_BENCHMARKS` with the acting user/workspace.
- Load/perf scripts emit `LOAD_DATASET_*` markers when using `pnpm db:seed:large`.
