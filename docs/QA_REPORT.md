# QA Report

## Frontend tests
- Routing smoke coverage ensures `/`, `/strategies`, `/compare`, and `/analytics` mount their respective pages without crashing under mocked auth.
- Overview, Strategy Detail, and Strategy Comparison pages validate tRPC query wiring, control updates, and loading/error fallbacks with lightweight fixtures.
- Run with `pnpm test:client` (root) or `pnpm --filter client test` to execute the Vitest suite locally; no extra Vitest flags are necessary.

Server suites: `pnpm test:server` (root) or `pnpm --filter server test` run the Vitest server specs under mock DB defaults.

## Backend notes
- Server suites continue to run under mock database defaults; ingestion specs that require a live DB stay skipped to keep CI green.
