# Deployment to Manus

## Prerequisites
- Node.js 20+
- pnpm 8.15+
- PostgreSQL 15+ reachable via `DATABASE_URL`
- Environment variables populated from `.env.example`

## Install
```bash
pnpm install --frozen-lockfile
```

## Typecheck
```bash
pnpm -w tsc
```

## Build
```bash
pnpm build          # runs client and server builds
pnpm build:client   # optional: client only
pnpm build:server   # optional: server only
```

## Database & Migrations
Ensure `DATABASE_URL` is set.
```bash
pnpm --filter drizzle run migrate   # executes Drizzle migrations against DATABASE_URL
```

## Start
```bash
# Backend (binds PORT, default 3001)
pnpm --filter server start

# Frontend preview (served from dist on port 4173 by default)
# ensure VITE_API_URL points at the backend, e.g. http://localhost:3001
pnpm --filter client preview
```

## Health Checks
- Backend: `GET /health` -> `{ "status": "ok", "db": "up" }` when the database responds, returns `503` with `{ "status": "degraded", "db": "down" }` if not.

## Environment Variables
- `PORT` (default 3001)
- `NODE_ENV`
- `DATABASE_URL`
- `VITE_API_URL` (client base URL for tRPC)

## Repository Layout
- `client/` (Vite React UI)
- `server/` (Express + tRPC API)
- `shared/` (shared TS types)
- `drizzle/` (schema + migrations)
- `scripts/` (database utilities)
- `docs/`, `archive/`, `package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`
