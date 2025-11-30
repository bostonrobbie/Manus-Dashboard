# Data Pipeline & Multi-Tenancy

## Schema
- `workspaces` table tracks Manus tenants (`external_id`, `name`, `owner_user_id`).
- `workspace_members` table maps users to workspaces with per-tenant roles (`viewer`, `editor`, `admin`).
- `audit_logs` captures user actions across workspaces for uploads and soft deletes.
- `users`, `strategies`, `trades`, and `benchmarks` all include `workspace_id` to enforce isolation.
- Migrations backfill a default workspace (`external_id=local-dev`, id `1`) so mock mode remains compatible.

Apply migrations with `pnpm --filter drizzle migrate` before serving traffic.

## Auth scoping
- Every tRPC call now receives `ctx.user { id, email, workspaceId }`.
- Routers now enforce workspace membership: viewers can read their workspace, while editors/admins/owners can mutate uploads, trades, benchmarks, and settings for their workspace only.
- In Manus mode, missing auth returns `UNAUTHORIZED`; in local mode a mock user (id 1/workspace 1) is injected when `MOCK_USER_ENABLED=true`.

## CSV ingestion & exports
- `uploadTradesCsv`/`ingestTradesCsv` attach both `userId` and `workspaceId` to new strategies and trades.
- Export endpoints (`exportTradesCsv`, `generateTradesCsv`) return rows only for the caller’s user/workspace scope.
- **Trades CSV schema**
  - Required columns: `symbol`, `side`, `quantity`, `entryPrice`, `exitPrice`, `entryTime`, `exitTime`
  - Optional columns: `strategy`, `strategyType`, `strategyId`
  - Sample:
    ```csv
    symbol,side,quantity,entryPrice,exitPrice,entryTime,exitTime,strategy,strategyType
    AAPL,long,10,150.25,155.10,2024-05-01T14:30:00Z,2024-05-03T20:00:00Z,Mean Reversion,swing
    SPY,short,5,500.00,480.00,2024-04-15T15:00:00Z,2024-04-20T19:00:00Z,Index Hedge,intraday
    ```
- **Benchmarks CSV schema**
  - Required columns: `symbol`, `date` (YYYY-MM-DD), `close`
  - Sample:
    ```csv
    symbol,date,close
    SPY,2024-05-01,502.11
    SPY,2024-05-02,503.44
    ```
- Uploads are persisted to `upload_logs` with `rowCountTotal`, `rowCountImported`, `rowCountFailed`, `status`, `errorSummary`, and `warningsSummary` for full auditability. Key ingestion and admin delete actions are mirrored into `audit_logs` with workspace/user context and short summaries (no sensitive payloads).
- Sanity checks reject empty symbols, zero quantities, inverted entry/exit times, and non-finite prices; extreme PnL versus notional is flagged as a warning instead of silently ingesting bad data.
- Ingestion enforces CSV headers (`symbol`, `side`, `quantity`, `entryPrice`, `exitPrice`, `entryTime`, `exitTime` for trades; `symbol`, `date`, `close` for benchmarks) and returns structured errors when columns are missing or unexpected. Dates and numeric values are normalized and non-finite/absurd values are rejected with per-row warnings.
- Uploads larger than `MAX_UPLOAD_BYTES` (default 5MB) or files that are not CSV/text are rejected before ingestion to avoid runaway processing.
- Deduplication: ingestion derives a stable `naturalKey` (or uses upstream `external_id` when present) and inserts with conflict handling on `(workspace_id, natural_key)` so reprocessing a file will not create duplicate trades.

## Sample & scripts
- Sample data is scoped to the mock workspace (`workspaceId=1`) so the dashboard renders without a database.
- `scripts/load-real-trades.ts` imports CSVs into workspace `1`; update `workspaceId` when targeting other tenants.
- `scripts/fetch_benchmarks_yf.py` downloads benchmark history via yfinance into the exact CSV layout above.
- Upload history endpoints expose the server-side audit trail so the UI can render per-workspace ingestion status.

## Operational notes
- Health checks (`/health`) surface `mode`, `manusReady`, and `mockUser` to confirm whether Manus headers are expected.
- Keep `MANUS_AUTH_HEADER_USER`/`MANUS_AUTH_HEADER_WORKSPACE` aligned between reverse proxies and the API; the frontend can mirror them via `VITE_MANUS_*` vars for local QA.

## Benchmark sourcing helper
Use `scripts/fetch_benchmarks_yf.py` to pull CSVs in the documented format:
```bash
pip install yfinance
python scripts/fetch_benchmarks_yf.py --symbols SPY,QQQ --start 2024-01-01 --out data/benchmarks
```
Upload the resulting CSV(s) through the Uploads/Data page under **Benchmarks**. yfinance is unofficial and subject to Yahoo Finance rate limits/terms.
