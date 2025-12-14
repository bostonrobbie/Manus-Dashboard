# Coordination Log

## 2025-12-15
- Standardized database config on MySQL/TiDB `DATABASE_URL` (updated `.env.example`, Drizzle env expectations) and documented resolution in `docs/SYNC_PLAN.md`.
- Added compareStrategies and benchmarks tRPC routers plus risk-of-ruin analytics module wired into portfolio metrics.
- Introduced @client path alias across tsconfigs, refreshed workspace scripts (test:client/test:all), and aligned navigation/routes to include `/compare`.
- Captured new QA touchpoints in README and created a risk-of-ruin unit test scaffold.

## 2025-12-16
- Aligned server test tooling so `pnpm --filter server test` runs node + vitest suites (currently failing on Manus env gaps and expectation changes; see QA report).
- Expanded trade filtering/CSV export plumbing (symbols, strategy multi-select, side/outcome, date range) with a shared client `TradeFilters` component feeding backend filters.
- Updated docs (QA report) to log test status; next pass will revisit visual analytics and remaining trade filter coverage.

## 2025-12-17
- Hardened test environment defaults (`server/config/testEnv.ts`) so auth and health logic no longer require Manus secrets, and guarded mysql pool creation during tests.
- Updated auth context to allow safe mock users in test/local modes, relaxed compareStrategies validation messaging, and fixed webhook secret handling to return 403 before DB access.
- Added tRPC health and portfolio probes with injectable hooks for tests; standardized Vitest include patterns to skip node-test files while keeping ingestion tests skipped under mock DB mode.
- `pnpm --filter server test` now passes in a clean env (ingestion tests marked skipped when no real DB); see QA report for command output.

## 2025-12-14
- Documented current backup state and gaps in `docs/SYNC_PLAN.md` to guide Manus-native parity work.
- Added `FEATURE_MANIFEST.md` to track backend/frontend/doc readiness and highlight missing risk-of-ruin and config alignment tasks.
- Noted DB env mismatch (Postgres URL vs MySQL Drizzle config) for early correction before deeper sync tasks.
