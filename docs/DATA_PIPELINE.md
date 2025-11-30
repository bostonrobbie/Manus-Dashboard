# Data Pipeline & Multi-Tenancy

## Schema
- `workspaces` table tracks Manus tenants (`external_id`, `name`).
- `users`, `strategies`, `trades`, and `benchmarks` all include `workspace_id` to enforce isolation.
- Migrations backfill a default workspace (`external_id=local-dev`, id `1`) so mock mode remains compatible.

Apply migrations with `pnpm --filter drizzle migrate` before serving traffic.

## Auth scoping
- Every tRPC call now receives `ctx.user { id, email, workspaceId }`.
- Routers require authentication and filter queries by `userId` **and** `workspaceId` when available.
- In Manus mode, missing auth returns `UNAUTHORIZED`; in local mode a mock user (id 1/workspace 1) is injected when `MOCK_USER_ENABLED=true`.

## CSV ingestion & exports
- `uploadTradesCsv`/`ingestTradesCsv` attach both `userId` and `workspaceId` to new strategies and trades.
- Export endpoints (`exportTradesCsv`, `generateTradesCsv`) return rows only for the caller’s user/workspace scope.
- Required CSV headers remain `symbol`, `side`, `quantity`, `entryPrice`, `exitPrice`, `entryTime`, `exitTime`; optional strategy metadata is mapped per row.
- Uploads are persisted to `upload_logs` with `rowCountTotal`, `rowCountImported`, `rowCountFailed`, `status`, `errorSummary`, and `warningsSummary` for full auditability.
- Sanity checks reject empty symbols, zero quantities, inverted entry/exit times, and non-finite prices; extreme PnL versus notional is flagged as a warning instead of silently ingesting bad data.

## Sample & scripts
- Sample data is scoped to the mock workspace (`workspaceId=1`) so the dashboard renders without a database.
- `scripts/load-real-trades.ts` imports CSVs into workspace `1`; update `workspaceId` when targeting other tenants.
- Upload history endpoints expose the server-side audit trail so the UI can render per-workspace ingestion status.

## Operational notes
- Health checks (`/health`) surface `mode`, `manusReady`, and `mockUser` to confirm whether Manus headers are expected.
- Keep `MANUS_AUTH_HEADER_USER`/`MANUS_AUTH_HEADER_WORKSPACE` aligned between reverse proxies and the API; the frontend can mirror them via `VITE_MANUS_*` vars for local QA.
