# Deployment to Manus

This guide captures the minimum configuration and runbook required to deploy the intraday dashboard on the Manus platform.

## Required environment variables

| Variable | Purpose | Notes |
| --- | --- | --- |
| `DATABASE_URL` | TiDB/MySQL connection string | Required when `MANUS_MODE` is enabled. |
| `NODE_ENV` | Runtime environment | Use `production` on Manus. |
| `PORT` | HTTP port for the server | Defaults to `3001` if unset. |
| `TRADINGVIEW_WEBHOOK_SECRET` | Secret used to validate TradingView webhook payloads | Must match the TradingView sender configuration. |
| `MANUS_MODE` | Enables Manus auth/strictness | Set to `true`/`manus` in production. |
| `MANUS_AUTH_HEADER_USER` | Header name carrying the Manus user JSON | Defaults to `x-manus-user-json`. |
| `MANUS_AUTH_HEADER_WORKSPACE` | Header name carrying the Manus workspace ID | Defaults to `x-manus-workspace-id`. |
| `MANUS_AUTH_HEADER_ROLES` | (Optional) Header carrying the role list | Only needed if Manus gateway forwards roles separately. |
| `MANUS_AUTH_HEADER_ORG` | (Optional) Header for organization scoping | Used when the gateway enforces org separation. |
| `MANUS_JWT_SECRET` / `MANUS_PUBLIC_KEY_URL` | Token validation inputs | At least one is required for Manus mode readiness. |
| `MOCK_USER_ENABLED` | Allows mock fallback user | Keep `false` in Manus; defaults to `true` for local/dev. |
| `AUTH_DEBUG_ENABLED` | Emits verbose auth logs | Default `false` in production. |
| `MAX_UPLOAD_BYTES` | Upload cap for CSV ingestion | Defaults to 5 MB. |

> The server will warn (and /health/full will report `auth: error`) if Manus auth secrets are missing when `MANUS_MODE` is enabled.

## Deploy steps (Manus container)

```bash
# Install workspace dependencies
pnpm install

# Apply database migrations (Drizzle)
pnpm migrate

# Build all packages (client + server)
pnpm build

# Start the server (assumes PORT/DATABASE_URL set by Manus)
pnpm --filter server start
```

## Health contract

- `GET /health` → 200 when the server is up and either operating with a database or falling back to mock data. Returns 202 when degraded but still serving.
- `GET /health/full` → Validates DB connectivity and Manus auth readiness. Returns 200 when DB is reachable and Manus auth inputs are present; 503/500 otherwise with details in the payload.

Deploy orchestration should poll `/health` during warmup and use `/health/full` for readiness checks before routing traffic.
