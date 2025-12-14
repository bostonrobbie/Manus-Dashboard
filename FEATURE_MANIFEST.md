# Feature Manifest
Status legend: ✅ Implemented & verified • ⚠️ Implemented, needs verification • 🟠 Planned / missing

## Backend
- ⚠️ Portfolio analytics engine (equity, drawdowns, payoff metrics) — present in `server/engine` but needs parity check vs Manus-native.
- ⚠️ Portfolio/strategies/comparison tRPC routers — defined under `server/routers` but require contract verification.
- 🟠 Risk of ruin calculations — not present; needs implementation aligned to Manus-native.
- ⚠️ Health endpoints (`/health`, `/health/full`) — implemented; confirm Manus checks and logging expectations.
- ⚠️ CSV ingestion and seed scripts — several scripts exist (demo/large seeds, CSV loaders); need validation against Manus workflows.

## Frontend
- ⚠️ Overview, Strategies, Strategy Detail, Strategy Comparison routes — wired in `client/src/App.tsx`; analytics and filters need Manus-native parity validation.
- ⚠️ Uploads/Admin/Settings utilities — routes exist; confirm feature completeness and access control.
- 🟠 Visual analytics (heatmaps, calendars, Monte Carlo, correlation matrix) — presence requires verification; fill gaps to match Manus-native UI.
- 🟠 Shared trade filters and CSV export alignment — needs consolidation and server-side parity checks.
- 🟠 Contract size toggle/global filters — not observed; add providers and UI controls consistent with Manus-native defaults.

## Documentation & QA
- ⚠️ README and env setup — present but require update once configuration is normalized.
- 🟠 QA coverage — unit/integration/UI/E2E suite needs alignment with Manus-native `test:all` expectations and reporting via `docs/QA_REPORT.md`.
- ✅ Sync plan tracking — `docs/SYNC_PLAN.md` established to coordinate Manus parity work.
