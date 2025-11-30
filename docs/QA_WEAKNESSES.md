# QA Weaknesses and Observations

- Property-based style checks in `server/tests/metricsProperty.test.ts` exercise drawdown bounds and expectancy math; no immediate numerical instabilities observed beyond the assumption of finite volatility.
- Risk guidance recommendations are heuristic and should be validated against real portfolios; extremely negative expectancy will clamp risk to a minimal value.
- Load and stress testing were not executed in this iteration; recommend extending synthetic datasets and running repeated query loops before production rollout. A lightweight `server/scripts/stress-queries.ts` helper now exists but should be wired into staging runs.
- Duplicate-trade protections now include database unique indexes and natural keys; add regression tests with varied precision and repeated CSV uploads to verify idempotency across environments.
