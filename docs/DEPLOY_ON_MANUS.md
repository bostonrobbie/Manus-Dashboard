# Deploying Manus Dashboard

This guide describes how to run the dashboard in Manus environments and how to keep the local mock path available for contributors.

## Modes
- **Manus mode (`MANUS_MODE=true`)**: requires Manus-provided headers or JWTs. Requests without auth will be rejected with `UNAUTHORIZED` errors.
- **Local/mock mode (`MANUS_MODE` unset, `MOCK_USER_ENABLED=true`)**: falls back to a deterministic mock user (`id=1`, `workspaceId=1`, `email=local@test`) so the app stays usable without Manus headers.

## Environment variables
| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string used by Drizzle. |
| `MANUS_MODE` | Enable Manus auth enforcement. Defaults to `false`. |
| `MANUS_AUTH_HEADER` | Header name that carries Manus user context (default `x-manus-user`). Accepts JSON/base64 JSON or a bearer token. |
| `MANUS_WORKSPACE_HEADER` | Header name for workspace/tenant (default `x-manus-workspace`). |
| `MANUS_JWT_SECRET` / `MANUS_PUBLIC_KEY_URL` | Token verification for Manus bearer tokens. Provide one when `MANUS_MODE=true`. |
| `MANUS_BASE_URL` | Optional link-out target for Manus. |
| `MOCK_USER_ENABLED` | Allow the mock user fallback when Manus headers are missing (defaults to `true`). |
| `VITE_MANUS_AUTH_HEADER` / `VITE_MANUS_AUTH_TOKEN` | Frontend-only helpers to inject headers during local testing. |
| `VITE_MANUS_WORKSPACE_HEADER` / `VITE_MANUS_WORKSPACE_ID` | Frontend workspace header helpers for local testing. |

## Health checks
`GET /health` returns:

```json
{
  "status": "ok|degraded",
  "db": "up|down",
  "mode": "MANUS|LOCAL_DEV",
  "manusReady": true,
  "mockUser": true,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

Treat `manusReady=false` as a warning when `MANUS_MODE=true` (missing JWT secret/public key).

## Running the stack
1. Install deps: `pnpm install`.
2. Apply migrations: `pnpm --filter drizzle migrate`.
3. Start API: `pnpm --filter server dev` (or `start` after `build`).
4. Start frontend: `pnpm --filter client dev`.

When running behind Manus, ensure the reverse proxy forwards `MANUS_AUTH_HEADER` and `MANUS_WORKSPACE_HEADER` to the API. The frontend can mirror those headers via the `VITE_*` variables for local smoke tests.
