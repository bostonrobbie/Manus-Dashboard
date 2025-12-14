# Manus Dashboard Sync Plan

## Purpose
This plan captures the current Manus-Dashboard backup state and outlines the work required to mirror the Manus-native dashboard. It focuses on structure, tooling, data layer, APIs, and frontend routes so the repo can rebuild and deploy independently.

## Current Backup Snapshot
- **Repository layout:** pnpm workspace with `client/`, `server/`, `shared/`, and `drizzle/` packages; root scripts orchestrate linting, type checks, build, tests, and seeds. Monthly snapshot tagging keeps `main` versioned.
- **Tooling:** pnpm 8.15.8, Node 22 target. Vite/React 19 frontend, Express + tRPC backend, Vitest + Playwright for tests. Path aliases now cover `@server/*`, `@shared/*`, `@drizzle/*`, and `@client/*` across tsconfig and Vite.
- **Database layer:** Drizzle configured for MySQL dialect with schema in `drizzle/`; DATABASE_URL expected for migrations. Engine and routers assume MySQL/TiDB.
- **API surface:** tRPC routers for auth, analytics, portfolio, strategies, compare, workspaces, uploads, webhooks, and system probes. Risk-of-ruin calculations and portfolio analytics available.
- **Frontend routes:** React Router covers `/`, `/overview`, `/strategies`, `/strategies/:strategyId`, `/compare`, `/analytics`, `/portfolios`, `/trades`, `/uploads`, `/admin`, `/settings` with shared dashboard chrome.
- **Testing:** Server Vitest suites run under mock DB defaults (ingestion specs skipped). Client Vitest covers overview/strategy/comparison pages plus routing smoke tests; QA summary captured in `docs/QA_REPORT.md`. Use `pnpm --filter server test` and `pnpm --filter client test` (or the root `test:server`/`test:client` scripts) without additional Vitest flags.

## Observed Gaps vs Manus-Native Requirements
- **Trade filters & exports:** Need final parity checks for CSV export and filter UX to ensure server-side alignment.
- **Global controls:** Contract size toggles and other cross-dashboard filters remain unimplemented.
- **Visual analytics depth:** Initial heatmaps/calendars/Monte Carlo are wired, but performance optimizations and broader panels (e.g., richer correlation/benchmark overlays) may be required.
- **Broader QA:** E2E coverage is light; resilience/performance checks and ingestion-path tests against a real DB are pending.

## Updates This Run
- **Database configuration mismatch resolved:** repository now standardizes on a MySQL/TiDB connection string via `DATABASE_URL`; Drizzle config and `.env.example` align with the server `mysql2` driver.
- **Test harness hardened:** Added `server/config/testEnv.ts`, guarded MySQL pool creation during tests, and tightened auth/webhook handling so server tests run without Manus secrets (ingestion specs skipped when no real DB).

## Concrete Next Steps
1. **Finalize ingestion & filters**
   - Reconcile CSV export/filter behavior with Manus-native expectations; add regression tests around shared filters.
   - Run ingestion specs against a disposable MySQL/TiDB instance and capture gaps.
2. **Expand visual analytics**
   - Add remaining panels (e.g., deeper benchmark overlays, configurable strategy sets) and ensure feature flags/coming-soon states stay accurate.
   - Optimize chart downsampling if dashboards slow under large datasets.
3. **QA & performance**
   - Extend Vitest/Playwright coverage to cover portfolio builder and uploads; add snapshot assertions for critical charts.
   - Validate monthly snapshot tags in CI and document recovery steps in release notes.
