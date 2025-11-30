# Manus Integration Plan

This plan describes how to adapt the canonical `Manus-Dashboard` repository so Manus can deploy it as the primary portfolio dashboard while preserving the improved portfolio engine and data pipeline.

## Goals
- Accept Manus-provided authentication (JWT/session/header) while retaining a local dev fallback.
- Make all API, database, and CSV flows multi-tenant/user aware.
- Preserve the existing portfolio engine, deterministic analytics, and global time range logic.
- Provide a shadcn-polished UI that mirrors Manus navigation and empty/error states.
- Document deployment for Manus operators and local contributors.

## Assumptions
- Manus will forward authenticated user context via headers or cookies; a middleware adapter can introspect this and hydrate `ctx.user`.
- PostgreSQL remains the primary datastore; Drizzle handles schema/migrations.
- Vite + tRPC remain the frontend/backend contract; shared types live in `shared/`.
- Local development may not have Manus auth available and needs a mock user path.

## Auth & User Model
- Introduce a `auth/manusMiddleware.ts` on the server that:
  - Extracts Manus tokens/headers (configurable via env, e.g., `MANUS_AUTH_HEADER`, `MANUS_PUBLIC_KEY_URL`).
  - Validates and attaches `{ id, email, roles, workspaceId }` to the tRPC context.
  - Falls back to a dev mock user when `NODE_ENV=development` and Manus headers are absent.
- Replace hardcoded `userId` defaults across routers, services, and loaders with context-derived user/workspace IDs.
- Add structured auth errors (`UNAUTHORIZED`, `FORBIDDEN`) that the client can surface as a redirect or "Connect to Manus" prompt.

## Data Model & Persistence
- Extend Drizzle schema to include `users`, `workspaces` (if needed), and ownership columns on portfolios, trades, benchmarks, upload logs, and strategy configs.
- Add migrations to backfill existing records with a default dev user/workspace for compatibility.
- Ensure CSV import/export and scripted loaders require a `userId/workspaceId` and associate rows accordingly.
- Provide seed/sample datasets for demo mode that target the mock user.

## API & Backend Changes
- Update tRPC context creation to consume Manus middleware output and pass the authenticated user through to routers.
- Ensure routers filter queries by user/workspace and respect the global time range input.
- Expand health check to report both database status and Manus auth readiness (e.g., key fetchable, middleware enabled).
- Add tests for auth gating (authenticated vs unauthenticated) and per-user data isolation in the portfolio engine.

## Frontend & UX
- Add an auth boundary that either uses Manus session (if available) or a dev banner explaining mock mode.
- Align navigation to Manus patterns: Overview, Strategies, Trades, Uploads/Data, Settings.
- Use shadcn components for layout, cards, tabs, dialogs, toasts, and tables; ensure empty/error states are explicit.
- Keep the global time range selector prominent and thread its value through all queries.
- Provide clear upload paths (CSV dropzone + history) and surface per-user filters.

## Operationalization
- Environment variables:
  - `DATABASE_URL`
  - `MANUS_AUTH_HEADER` (name of inbound header)
  - `MANUS_PUBLIC_KEY_URL` or `MANUS_JWT_SECRET`
  - `MANUS_BASE_URL` for linking out to Manus
  - `MOCK_USER_ENABLED` for local dev fallback
- Scripts to standardize DX:
  - `pnpm dev` (full stack), `pnpm --filter server dev`, `pnpm --filter client dev`
  - `pnpm --filter drizzle run migrate`
  - `pnpm -r test` for combined test runs
  - `pnpm --filter server smoke` for lightweight endpoint checks

## Testing Strategy
- Keep existing portfolio engine and CSV pipeline tests.
- Add tests for:
  - Auth middleware behavior (valid token, missing token, mock user).
  - User-scoped queries in routers and analytics.
  - Global time range propagation across pages.
- Target command: `pnpm -r test` from the repo root; CI should run lint/tsc where configured.

## Documentation Updates
- Refresh `README.md` to highlight Manus deployment steps and local dev mock mode.
- Create/refresh `docs/DEPLOY_ON_MANUS.md` with env vars, health checks, and auth wiring instructions.
- Document CSV mapping and user scoping in `docs/DATA_PIPELINE.md`.
- Keep `AGENTS.md` aligned with repository workflows for future AI contributors.

## Open Questions
- Exact Manus auth token format (JWT vs opaque token + introspection) — middleware should support pluggable verification.
- Whether Manus uses workspaces/tenants beyond user identity; schema should accommodate a nullable `workspaceId`.
- Whether Manus requires audit logging for uploads and user actions; if so, extend upload logs accordingly.
