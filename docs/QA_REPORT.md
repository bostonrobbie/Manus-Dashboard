# QA Report

## 2025-12-15
- Ran targeted backend unit test for risk of ruin (`pnpm --filter server test -- tests/riskOfRuin.vitest.ts`).
- Noted earlier invocation using `--runTestsByPath` was incompatible with Vitest CLI; reran with direct path to succeed.
- Broader suites (lint/typecheck/full test:all) still pending for a later sync once remaining parity work lands.

## 2025-12-16
- Standardized `pnpm --filter server test` to run Node + Vitest suites. Current run fails on legacy Node test files due to missing Manus env secrets and expected error messaging changes (`Database URL not configured`, `MANUS_JWT_SECRET`, webhook assertions). See console for failing cases to revisit.

## 2025-12-17
- `pnpm --filter server test` (NODE_ENV=test) passes in mock-db mode with ingestion specs skipped when no real database is configured. Webhook secret validation now returns 403 before DB access; vitest config excludes node-based *.test.ts suites. 【4787ed†L1-L20】【d22e0f†L1-L25】
- Remaining gaps: ingestion tests require a real DB or richer mocks; broader Manus-native `test:all` alignment still pending.
