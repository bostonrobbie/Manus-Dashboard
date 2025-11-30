# Deploying Manus Dashboard

This guide describes how to run the dashboard in Manus environments and how to keep the local mock path available for contributors.

## Modes
- **Manus mode (`MANUS_MODE=true`)**: requires Manus-provided headers or JWTs. Requests without auth will be rejected with `UNAUTHORIZED` errors.
- **Local/mock mode (`MANUS_MODE` unset, `MOCK_USER_ENABLED=true`)**: falls back to a deterministic mock user (`id=1`, `workspaceId=1`, `email=local@test`) so the app stays usable without Manus headers.

## Environment variables
| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string used by Drizzle. Required when `MANUS_MODE=true`. |
| `MANUS_MODE` | Enable Manus auth enforcement. Defaults to `false`. |
| `MANUS_AUTH_HEADER_USER` | Header name that carries Manus user context (default `x-manus-user-json`). Accepts JSON/base64 JSON or a bearer token. |
| `MANUS_AUTH_HEADER_WORKSPACE` | Header name for workspace/tenant (default `x-manus-workspace-id`). |
| `MANUS_JWT_SECRET` / `MANUS_PUBLIC_KEY_URL` | Token verification for Manus bearer tokens. One is required when `MANUS_MODE=true`.|
| `MANUS_BASE_URL` | Optional link-out target for Manus. |
| `MOCK_USER_ENABLED` | Allow the mock user fallback when Manus headers are missing (defaults to `true`). |
| `MANUS_AUTH_STRICT` | Enforce Manus auth headers and fail requests when missing (default `true` in MANUS mode, `false` locally). |
| `MANUS_ALLOW_MOCK_ON_AUTH_FAILURE` | When Manus headers are missing and strict mode is off, fall back to a deterministic Manus mock user (default `false` in MANUS_MODE, `true` in LOCAL_DEV). |
| `AUTH_DEBUG_ENABLED` | Enable the `auth.debug` endpoint and Settings debug panel in production. Defaults to `true` outside production; recommended `false` in production. |
| `VITE_MANUS_AUTH_HEADER` / `VITE_MANUS_AUTH_TOKEN` | Frontend-only helpers to inject headers during local testing. |
| `VITE_MANUS_WORKSPACE_HEADER` / `VITE_MANUS_WORKSPACE_ID` | Frontend workspace header helpers for local testing. |

## Health checks
`GET /health` returns a shallow heartbeat with mode, Manus readiness, `db`/`workspaces`/`uploads` signals, and the current build version/commit when available.

`GET /health/full` runs database and table probes and returns structured JSON including `db`, `workspaces`, `uploads`, and `auth` statuses. Failures return HTTP 503 and include details for operators. `GET /version` returns `{ version, commit }` and can be scraped by deployment tooling.

## Running the stack
1. Install deps: `pnpm install`.
2. Apply migrations: `pnpm --filter drizzle migrate`.
3. Start API (prod contract): `pnpm start` (builds server and starts on `PORT`, default `3001`).
4. Start API (dev): `pnpm --filter server dev`.
5. Start frontend: `pnpm --filter client dev`.

When running behind Manus, ensure the reverse proxy forwards `MANUS_AUTH_HEADER_USER` and `MANUS_AUTH_HEADER_WORKSPACE` to the API. The frontend can mirror those headers via the `VITE_*` variables for local smoke tests.

## Smoke test
After deploy, run `pnpm smoke:test` to hit `/health`, `/health/full`, and `workspaces.list` through tRPC using configured Manus headers. Set `SMOKE_ALLOW_DEGRADED=true` only for local environments without a database.

## Auth debug & fallback quickstart
- Enable debug (`AUTH_DEBUG_ENABLED=true` or any non-production `NODE_ENV`) and open **Settings / Health** to see the new Auth debug panel.
- The panel shows Manus mode, strict toggle, configured header names, parsed user, and any detected `x-*` headers (secrets masked). Use this to line up Manus reverse-proxy headers with `MANUS_AUTH_HEADER_USER` and `MANUS_AUTH_HEADER_WORKSPACE`.
- Fallbacks:
  - `MANUS_AUTH_STRICT=true`: requests without Manus headers fail with `UNAUTHORIZED`.
  - `MANUS_ALLOW_MOCK_ON_AUTH_FAILURE=true`: when Manus mode is on but headers are missing, the API injects a deterministic Manus mock user (`mock@manus.local`). Recommended for local/testing alongside `MANUS_AUTH_STRICT=false`.
  - Production recommendation: `MANUS_MODE=MANUS`, `MANUS_AUTH_STRICT=true`, `MANUS_ALLOW_MOCK_ON_AUTH_FAILURE=false`, `AUTH_DEBUG_ENABLED=false` once headers are verified via the debug panel.
