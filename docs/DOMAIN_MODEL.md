# Domain Model

## Workspaces
- Represent a logical portfolio or trading book boundary used for tenancy and analytics.
- Key fields: `id` (surrogate PK), `externalId` (unique Manus/workflow handle), optional `name`, and `ownerUserId` for workspace ownership ties.
- Memberships live in `workspace_members` with one row per Manus user and workspace.
- Example:
```json
{
  "id": 12,
  "externalId": "manus-ws-12",
  "name": "Macro Desk",
  "ownerUserId": 5,
  "createdAt": "2024-04-02T18:33:21Z"
}
```

## Users and Roles
- Manus injects a serialized user header that is parsed into `AuthUser`/`SharedAuthUser` with `id`, `email`, optional `name`, `roles`, and `workspaceId`.
- Workspace roles: `viewer` (read only), `editor` (ingest uploads), `admin` (workspace-level admin actions), `owner` (superset for the workspace). Manus role claims such as `platform-admin` also map to admin rights.
- Memberships are resolved through `workspace_members` plus ownership; RBAC gates write paths in routers and Admin Data Manager.
- Example header payload:
```json
{
  "id": 7,
  "email": "analyst@manus.dev",
  "name": "Analyst A",
  "roles": ["viewer"],
  "workspaceId": 12,
  "workspaceRole": "viewer",
  "source": "manus"
}
```

## Trades
- `trades` stores executed positions for analytics and exports, scoped by `workspace_id` and linked to a `strategy_id`.
- Key columns: `id`, `workspaceId`, `strategyId`, `symbol`, `side`, `quantity`, `entryPrice`, `exitPrice`, `entryTime`, `exitTime`, `pnl` derived at query time, `uploadId`, `externalId`, `naturalKey`, `deletedAt`, `createdAt`.
- Uniqueness: `(workspace_id, external_id)` and `(workspace_id, natural_key)` guard against duplicates per workspace; soft deletes keep history via `deleted_at`.
- Example row:
```json
{
  "id": 2401,
  "workspaceId": 12,
  "strategyId": 33,
  "symbol": "AAPL",
  "side": "long",
  "quantity": 120.5,
  "entryPrice": 171.25,
  "exitPrice": 176.80,
  "entryTime": "2024-05-10T14:32:00Z",
  "exitTime": "2024-05-15T19:55:00Z",
  "externalId": "broker-trade-889",
  "naturalKey": "AAPL|2024-05-10T14:32:00Z|long|120.5",
  "uploadId": 94,
  "deletedAt": null
}
```

## Benchmarks
- `benchmarks` records workspace-scoped benchmark closes (e.g., SPY) keyed by `symbol` + `date` with optional `uploadId` and soft delete support.
- Used by the analytics engine for equity comparisons and drawdown context.
- Example:
```json
{
  "id": 81,
  "workspaceId": 12,
  "symbol": "SPY",
  "date": "2024-05-15",
  "close": 526.12,
  "uploadId": 93,
  "deletedAt": null
}
```

## Uploads and Upload Logs
- `upload_logs` captures each ingest session: source `fileName`, `uploadType` (`trades`, `benchmarks`, `equity`), counts for total/imported/failed rows, `status`, timestamps, and summaries for errors or warnings.
- Trades and benchmarks rows link back to `uploadId` to enable soft deletes and audit trails.
- Example session:
```json
{
  "id": 93,
  "workspaceId": 12,
  "userId": 7,
  "fileName": "trades-may.csv",
  "uploadType": "trades",
  "rowCountTotal": 200,
  "rowCountImported": 198,
  "rowCountFailed": 2,
  "status": "partial",
  "startedAt": "2024-05-16T09:10:11Z",
  "finishedAt": "2024-05-16T09:10:18Z",
  "errorSummary": "2 rows missing exitTime",
  "warningsSummary": "1 duplicate natural key skipped"
}
```

## Analytics Entities
- Derived types live in `shared/types/portfolio.ts` and flow from server analytics to the client via tRPC.
- Core shapes: `StrategyMetrics`, `WorkspaceMetrics`, `EdgeAnalytics`/`WorkspaceEdge`, and `WorkspaceReport` (rollups for reports and charts).
- Example workspace metrics payload:
```json
{
  "totalReturnPct": 12.4,
  "maxDrawdownPct": -5.8,
  "sharpe": 1.35,
  "sortino": 1.72,
  "profitFactor": 1.8,
  "expectancyPerTrade": 42.1,
  "winRatePct": 54.2,
  "lossRatePct": 45.8,
  "alpha": 0.6
}
```

## Audit Logs
- `audit_logs` records every admin-sensitive action (uploads, soft deletes, data manager operations) with `action`, `entityType`, optional `entityId`, and a human-readable `summary`.
- Supports retrospective reviews without storing sensitive payloads; entries are timestamped and scoped by `workspaceId` and `userId`.
- Example:
```json
{
  "id": 141,
  "workspaceId": 12,
  "userId": 7,
  "action": "soft_delete",
  "entityType": "trades",
  "entityId": "upload:93",
  "summary": "Soft-deleted 198 trades from upload 93",
  "createdAt": "2024-05-16T09:12:00Z"
}
```
