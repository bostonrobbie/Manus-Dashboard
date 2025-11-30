# QA Weaknesses and Observations

- Property-based style checks in `server/tests/metricsProperty.test.ts` exercise drawdown bounds and expectancy math; no immediate numerical instabilities observed beyond the assumption of finite volatility.
- Risk guidance recommendations are heuristic and should be validated against real portfolios; extremely negative expectancy will clamp risk to a minimal value.
- Load and stress testing were not executed in this iteration; recommend extending synthetic datasets and running repeated query loops before production rollout. A lightweight `server/scripts/stress-queries.ts` helper now exists but should be wired into staging runs.
- Duplicate-trade protections now include database unique indexes and natural keys; add regression tests with varied precision and repeated CSV uploads to verify idempotency across environments.
- RBAC now gates write operations to workspace owners/admins/editors; viewers are read-only. Verify multi-tenant permissions with real Manus headers to ensure membership joins behave as expected.
- Audit logs are recorded for uploads and admin soft-deletes; no sensitive payloads are stored, but the table should be sampled periodically to confirm rotation/volume expectations.
- A Playwright UI smoke test exists (`pnpm e2e`) to walk key pages with mock headers; it does not perform visual regression checks or cross-browser matrix coverage.
