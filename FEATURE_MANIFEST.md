# Feature Manifest
Status legend: ✅ Implemented & verified • ⚠️ Implemented, needs verification • 🟠 Planned / missing

## Backend
- ⚠️ Portfolio analytics engine (equity, drawdowns, payoff metrics) — present in `server/engine` with risk-of-ruin wiring; needs Manus-native parity verification.
- ⚠️ Portfolio/strategies/comparison tRPC routers — defined under `server/routers` (portfolio, strategies, compareStrategies, benchmarks) with trade filter inputs expanded; contract verification still needed.
- ⚠️ Risk of ruin calculations — implemented in `server/engine/riskOfRuin` and surfaced via portfolio metrics; needs validation against Manus-native outputs.
- ⚠️ Health endpoints (`/health`, `/health/full`) — implemented; confirm Manus checks and logging expectations.
- ⚠️ CSV ingestion and seed scripts — several scripts exist (demo/large seeds, CSV loaders); ingestion unit tests are skipped under mock DB until real DB wiring is available.

## Frontend
- ⚠️ Overview, Strategies, Strategy Detail, Strategy Comparison routes — wired in `client/src/App.tsx`; filters and analytics wired but still require Manus-native parity validation.
- ⚠️ Uploads/Admin/Settings utilities — routes exist; confirm feature completeness and access control.
- 🟠 Visual analytics (heatmaps, calendars, Monte Carlo, correlation matrix) — correlation and Monte Carlo present; heatmaps/calendar/distribution still to be wired to real data.
- ⚠️ Shared trade filters and CSV export alignment — server and client now accept symbols/strategies/side/outcome/date, pending deeper QA.
- 🟠 Contract size toggle/global filters — not observed; add providers and UI controls consistent with Manus-native defaults.

## Documentation & QA
- ⚠️ README and env setup — present but require update once configuration is normalized.
- ⚠️ QA coverage — backend `pnpm --filter server test` now passes in mock-db mode (ingestion specs skipped); broader Manus-native `test:all` alignment still pending and logged in QA_REPORT.
- ✅ Sync plan tracking — `docs/SYNC_PLAN.md` established to coordinate Manus parity work.
