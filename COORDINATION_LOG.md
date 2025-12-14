# Coordination Log

## 2025-12-14
- Documented current backup state and gaps in `docs/SYNC_PLAN.md` to guide Manus-native parity work.
- Added `FEATURE_MANIFEST.md` to track backend/frontend/doc readiness and highlight missing risk-of-ruin and config alignment tasks.
- Noted DB env mismatch (Postgres URL vs MySQL Drizzle config) for early correction before deeper sync tasks.

## 2025-12-15
- Wired frontend parity: navigation now includes Compare (`/compare`) and Visual Analytics (`/analytics`) with tRPC-driven heatmaps/calendars and Monte Carlo panels.
- Fixed equity baseline rendering by using data-driven Y domains across equity charts and confirmed baseline inclusion on dashboard/strategy charts.
- Added routing + dashboard Vitest coverage, refreshed README build/test steps, documented QA report, and introduced monthly snapshot tagging via GitHub Actions.

## 2025-12-16
- Cleaned up stale Vitest flag references, standardizing on the workspace test commands without `--runInBand`.
- Aligned README, QA report, and sync plan testing instructions with the actual root and workspace scripts so build/test flows are unambiguous.
