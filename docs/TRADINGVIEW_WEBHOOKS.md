# TradingView Webhook Integration

This dashboard exposes a lightweight webhook endpoint that accepts TradingView alerts and feeds them through the existing trade ingestion + analytics pipeline.

## Endpoint
- **URL**: `/webhooks/tradingview`
- **Method**: `POST`
- **Content-Type**: `application/json`

## Authentication
- Configure `TRADINGVIEW_WEBHOOK_SECRET` in the server environment.
- Every request must include the shared secret either as:
  - Header: `x-webhook-secret: <secret>`
  - Query param: `?secret=<secret>`
- Requests without the correct secret return `401`.

## Payload contract
The webhook accepts a minimal TradingView-friendly payload:

```json
{
  "workspace_key": "workspace-external-id",
  "strategy_key": "intraday-scout", // or "strategy_id": 2
  "symbol": "SPY",
  "side": "long", // accepts "long" | "short" | "buy" | "sell"
  "quantity": 5,
  "execution_price": 515.4,
  "timestamp": "2024-05-20T14:30:00Z", // ISO string or unix seconds
  "external_id": "tv-alert-123",      // optional, used for dedupe
  "notes": "alert label or custom text" // optional
}
```

Notes:
- `workspace_key` maps to the workspace `external_id` (or `workspace_id` if a numeric id is supplied).
- `strategy_key` maps to a strategy name in the workspace. If it does not exist, a new strategy is created. `strategy_id` can be used instead for explicit IDs.
- Missing timestamps are rejected. Prices/quantities must be numeric.

## Processing flow
1. The webhook validates the shared secret and resolves the workspace (by `workspace_key` or `workspace_id`).
2. The trade is normalized into the standard ingestion shape with a stable `naturalKey` for deduplication.
3. The trade is inserted via the same path as CSV uploads, recorded in `upload_logs` as a "tradingview-webhook" upload, and subject to duplicate skipping on `(workspace_id, natural_key)`.
4. Successful trades immediately surface in:
   - **Trade Log** (Trades page)
   - **Overall performance** and **Strategy performance** analytics
   - Any **Custom portfolio** combinations that include the strategy

## Example TradingView alert message
```
{{strategy.order.action}} {{strategy.position_size}} {{ticker}}
Price: {{close}}
Workspace: workspace-external-id
Strategy: intraday-scout
Secret: <your secret>
```
Configure your webhook URL as:
```
https://<dashboard-host>/webhooks/tradingview?secret=<your secret>
```

## Visibility
- Webhook-ingested trades appear in the Uploads/Admin Data Manager audit trail with source `tradingview-webhook`.
- RBAC, tenancy, and analytics semantics remain unchanged—trades are scoped to the resolved workspace and strategy.
