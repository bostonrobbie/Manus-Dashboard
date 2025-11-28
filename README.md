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
3. Copy `.env.example` to `.env` and set `DATABASE_URL` if available.
4. Run the backend: `pnpm --filter server dev`.
5. Run the frontend: `pnpm --filter client dev`.

## Building
- `pnpm run build` builds all workspaces.
- `pnpm --filter server start` starts the compiled API (port defaults to 4000).

## Health
`GET /health` returns `{ "status": "ok" }` and can be used for Manus readiness checks.
