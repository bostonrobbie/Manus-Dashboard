# Manus Dashboard Sync Plan

## Purpose
This plan captures the current Manus-Dashboard backup state and outlines the work required to mirror the Manus-native dashboard. It focuses on structure, tooling, data layer, APIs, and frontend routes so the repo can rebuild and deploy independently.

## Current Backup Snapshot
- **Repository layout:** pnpm workspace with `client/`, `server/`, `shared/`, and `drizzle/` packages; root scripts orchestrate linting, type checks, build, and seeds.
- **Tooling:** pnpm 8.15.8, Node 22 target. Root scripts cover lint, typecheck, build, migrate, seeds, and e2e; client uses Vite/React 19, server uses Express + tRPC + Vitest.
- **Path aliases:** `@server/*`, `@shared/*`, `@drizzle/*` registered in base tsconfig; `@client/*` not yet defined.
- **Database layer:** Drizzle configured for MySQL dialect with schema in `drizzle/`; `DATABASE_URL` required for migrations. `.env.example` currently points to Postgres, creating a mismatch.
- **API surface:** Express entry with tRPC routers; health checks available (`/health`, `/health/full`). Risk-of-ruin calculation module is not present in the current engine.
- **Frontend routes:** React Router defines `/`, `/overview`, `/strategies`, `/strategies/:strategyId`, `/strategy-comparison`, `/portfolios`, `/trades`, `/uploads`, `/admin`, `/settings`.

## Observed Gaps vs Manus-Native Requirements
- **Env/database alignment:** MySQL Drizzle config conflicts with Postgres URL in `.env.example`; must align to the actual Manus DB target and document clearly.
- **Path aliases:** Add `@client/*` so shared imports mirror Manus-native conventions.
- **Analytics completeness:** No dedicated risk-of-ruin module; need parity with Manus-native analytics, equity curve baseline handling, and rolling metrics.
- **Router coverage:** Need confirmation/sync for portfolio, strategies, comparison, benchmarks, webhooks routers to match Manus-native contracts.
- **Data ingestion/monitoring:** Scripts for uploads/health exist but need validation against Manus-native CSV ingestion and monitoring expectations.
- **Docs/testing:** README and .env.example need refreshed install/run/deploy steps; QA coverage needs to mirror Manus-native (unit, integration, E2E) and be summarized in QA_REPORT.

## Concrete Next Steps
1. **Normalize tooling & config**
   - Add `@client/*` alias across tsconfigs; ensure workspace scripts expose `lint`, `typecheck`, `build`, `test:server`, `test:client`, `test:all` in a Manus-consistent way.
   - Reconcile `.env.example` with Drizzle MySQL setup or update Drizzle config if Postgres is the Manus target.
2. **Backend parity**
   - Introduce risk-of-ruin module and verify analytics coverage (equity curves, rolling metrics, underwater curves, time breakdowns, payoff metrics).
   - Audit tRPC routers and REST endpoints against Manus-native requirements; add missing routers (portfolio, strategies, comparison, benchmarks, webhooks) and `/health/full` parity checks.
   - Ensure migrations/seeds rebuild the DB end-to-end; validate CSV ingestion scripts for real-trade and benchmark data.
3. **Frontend parity**
   - Confirm pages match Manus-native layouts and analytics (overview, strategies, strategy detail, comparison, visual analytics). Add global filters and contract size controls as required.
   - Fix equity curve baseline handling and ensure CSV export honors server-side filters.
4. **Testing & QA**
   - Align unit/integration/UI tests with Manus-native coverage and wire `pnpm test:all` to run the full suite.
   - Produce `docs/QA_REPORT.md` after test pass with noted deviations.
5. **Documentation & readiness**
   - Update README with deploy steps (local, Manus, generic VPS) and environment references; keep secrets out of repo.
   - Maintain `COORDINATION_LOG.md` and `FEATURE_MANIFEST.md` to track sync progress and feature status.
