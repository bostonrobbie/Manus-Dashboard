# Feature Manifest
Status legend: ✅ Implemented & verified • ⚠️ Implemented, needs verification • 🟠 Planned / missing

## Backend
- ✅ Portfolio analytics engine (equity, drawdowns, payoff metrics) — normalized for MySQL/TiDB and exercised via tRPC.
- ✅ Portfolio/strategies/comparison tRPC routers — contracts in `server/routers` aligned with health/system probes.
- ✅ Risk of ruin calculations — implemented alongside analytics/range metrics.
- ⚠️ CSV ingestion and seed scripts — present (demo/large seeds, CSV loaders); keep validating against Manus workflows.

## Frontend
- ✅ Overview, Strategies, Strategy Detail, Strategy Comparison routes — wired in `client/src/App.tsx` with equity baseline fixes and new routing smoke tests.
- ⚠️ Visual analytics (heatmaps, calendars, Monte Carlo, correlation matrix) — wired to live tRPC analytics; continue expanding coverage as backend features grow.
- ⚠️ Shared trade filters and CSV export alignment — needs consolidation and server-side parity checks.
- 🟠 Contract size toggle/global filters — still planned; add providers and UI controls consistent with Manus-native defaults.

## Documentation & QA
- ✅ README and env setup — refreshed with build/test flows and monthly snapshot guidance.
- ✅ QA coverage — `docs/QA_REPORT.md` summarizes frontend routing and dashboard Vitest coverage; server suites run under mock DB with ingestion specs skipped.
- ✅ Sync plan tracking — `docs/SYNC_PLAN.md` updated to reflect remaining secondary items.
