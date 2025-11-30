# Manus Contract Checklist

This document summarizes the deployment contract Manus operators should rely on when running the dashboard in production.

## Required env (Manus mode)
- `DATABASE_URL`: PostgreSQL connection string.
- `MANUS_MODE=true`: enable Manus enforcement.
- `MANUS_AUTH_HEADER_USER`: header carrying the Manus user context (default `x-manus-user`).
- `MANUS_AUTH_HEADER_WORKSPACE`: header carrying the Manus workspace/tenant (default `x-manus-workspace`).
- One of `MANUS_JWT_SECRET` or `MANUS_PUBLIC_KEY_URL`: token verification inputs.
- Optional: `MANUS_BASE_URL` for link-outs, `MOCK_USER_ENABLED` (default `true`) for local dev.

Frontend helpers for local/manual testing: `VITE_MANUS_AUTH_HEADER`, `VITE_MANUS_AUTH_TOKEN`, `VITE_MANUS_WORKSPACE_HEADER`, `VITE_MANUS_WORKSPACE_ID`.

## Start command and port
- Start: `pnpm start` from repo root (builds server then runs `dist/server/src/index.js`).
- Port: `PORT` env (default `3001`), bound to `0.0.0.0`.

## Health endpoints
- `GET /health`: lightweight heartbeat; returns `status`, `mode`, `manusReady`, `mockUser`, `warnings`.
- `GET /health/full`: deep probe; returns `db`, `workspaces`, `uploads`, `auth`, `warnings`, and `details`. Responds with `503` when any signal is unhealthy.

## Smoke test
- Command: `pnpm smoke:test`
- Behavior: calls `/health`, `/health/full`, and `workspaces.list` through tRPC using `MANUS_AUTH_HEADER_USER` and `MANUS_AUTH_HEADER_WORKSPACE` headers. Exits non-zero on failure.
- Local-only escape hatch: set `SMOKE_ALLOW_DEGRADED=true` to ignore missing databases when running smoke tests on laptops.

## Operator reading order
1. `AGENTS.md` (repository rules).
2. `docs/DEPLOY_ON_MANUS.md` (deployment steps and env matrix).
3. `docs/MANUS_INTEGRATION_PLAN.md` (auth and tenancy rationale).
4. `docs/DATA_PIPELINE.md` (ingestion and workspace scoping).
5. This checklist.

## Quick verification
- Run `pnpm smoke:test` after deploy.
- Open the Settings page to confirm `Mode`, `DB`, `Workspaces`, `Uploads`, and `Auth` badges are green.
- Upload a small CSV and confirm an upload log row appears for the active workspace.
- Navigate Overview/Strategies to validate workspace-scoped analytics render.

## Summary
- **Contract surface**: `pnpm start` on `PORT` with Manus headers (`MANUS_AUTH_HEADER_USER`, `MANUS_AUTH_HEADER_WORKSPACE`) and JWT inputs. Health at `/health` and `/health/full`.
- **Logging & health**: structured JSON logs tagged with mode/component; health endpoints emit warnings when Manus secrets or DB are missing and return `503` on deep failures.
- **Smoke test**: `pnpm smoke:test` exercises health and `workspaces.list` with Manus headers; fails fast on non-200 responses.
- **Future improvements**: wire Manus link-outs into the UI when `MANUS_BASE_URL` is provided, add optional latency/queue metrics to health responses, and extend smoke tests to cover uploads with fixture CSVs.
