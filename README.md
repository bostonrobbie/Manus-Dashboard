# Manus Dashboard

A Manus-compatible, Antigravity-ready monorepo with a React 19 + Vite frontend and an Express + tRPC backend. The portfolio engine provides deterministic analytics backed by Drizzle ORM and PostgreSQL, with sample data available when no database is configured.

## Workspaces
- `client/` – Vite-powered dashboard UI (active frontend)
- `server/` – Express + tRPC API
- `shared/` – Shared TypeScript contracts
- `drizzle/` – Database schema and migrations
- `scripts/` – Operational helpers
- `app/` – Legacy dashboard kept for reference; not part of standard builds

## Getting Started
1. Install pnpm if needed: `corepack enable`.
2. Install dependencies: `pnpm install`.
3. Copy `.env.example` to `.env` and set `DATABASE_URL` if available. Leave `MOCK_USER_ENABLED=true` for local mock mode or set `MANUS_MODE=true` when Manus headers/JWTs are expected.
4. Run the backend: `pnpm --filter server dev`.
5. Run the frontend: `pnpm --filter client dev`.

## Development commands
- `pnpm lint` – ESLint across client/server/shared packages.
- `pnpm typecheck` – TypeScript across all workspaces without emitting build output.
- `pnpm test:all` – lint, typecheck, server tests, server build, and client build in sequence.
- Optional ops checks: `pnpm smoke:test` against a running API.

> Manus operators: see [docs/MANUS_INTEGRATION_PLAN.md](docs/MANUS_INTEGRATION_PLAN.md) for the staged auth/data alignment steps before production rollout.

## Building
- `pnpm run build` builds all workspaces.
- `pnpm start` builds then starts the compiled API (port defaults to 3001).

## Health
`GET /health` returns `{ status, mode, manusReady, mockUser, db, workspaces, uploads, version, warnings }` and can be used for Manus readiness checks. `GET /health/full` probes the database, workspaces table, upload logs, and Manus auth readiness; failures return `503` with details. `GET /version` returns `{ version, commit }` derived from the repo version and optional `BUILD_COMMIT`.

## Auth & data modes
- **Manus mode** (`MANUS_MODE=true`): expects `MANUS_AUTH_HEADER_USER`/`MANUS_AUTH_HEADER_WORKSPACE` (or a bearer token validated via `MANUS_JWT_SECRET`/`MANUS_PUBLIC_KEY_URL`). Requests without auth return `UNAUTHORIZED`.
- **Local/mock mode** (`MOCK_USER_ENABLED=true`): injects a deterministic mock user (`id=1`, `workspaceId=1`) so the dashboard stays usable without Manus headers. Frontend helpers `VITE_MANUS_AUTH_HEADER`/`VITE_MANUS_AUTH_TOKEN` can be set to mirror Manus headers during local QA.

## Manus Integration Track
- High-level migration and compatibility work is tracked in [docs/MANUS_INTEGRATION_PLAN.md](docs/MANUS_INTEGRATION_PLAN.md).
- Deployment prerequisites and commands are in [docs/DEPLOY_ON_MANUS.md](docs/DEPLOY_ON_MANUS.md).
- Data scoping and CSV handling are described in [docs/DATA_PIPELINE.md](docs/DATA_PIPELINE.md).
- Architecture and portfolio engine details are in `docs/` (see `Architecture.md` and `PortfolioEngine.md`).
