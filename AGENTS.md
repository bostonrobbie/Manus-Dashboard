# AI Contributor Guidelines

- Use pnpm-based scripts; prefer `pnpm -r test` or workspace-specific commands over npm/yarn.
- Keep changes within `client/`, `server/`, `shared/`, `drizzle/`, and `docs/`; `app/` is legacy and should not be modified unless explicitly requested. Do not reintroduce legacy dashboard shells or alternate routes.
- When touching authentication or data flows, add or update documentation under `docs/` and keep README instructions consistent.
- Favor TypeScript strictness and avoid introducing global mutable state; prefer dependency-injected contexts for API layers.
- Tests and typing checks should be run from the repository root or workspace scope; record executed commands in the final summary.
- Treat the following as contract files—avoid changing them unless explicitly instructed and double-check any edits: `drizzle/schema.ts`, migrations under `drizzle/`, `server/src/config/manus.ts`, `docs/MANUS_CONTRACT_CHECKLIST.md`, and `pnpm-workspace.yaml`.
- Before submitting changes: run `pnpm lint`, `pnpm typecheck`, and `pnpm test:all` from the repo root (optionally `pnpm smoke:test` if the API is running) and summarize the results.

## Task types
- **Infra/auth/data tasks**: Read `docs/ARCHITECTURE.md`, `docs/DOMAIN_MODEL.md`, `docs/MANUS_HANDOFF.md`, and `docs/DEPLOY_ON_MANUS.md` before editing. Validate with `pnpm lint`, `pnpm typecheck`, and `pnpm test:all`; run `pnpm smoke:test` if you touch auth headers or readiness probes.
- **Analytics/quant tasks**: Review `server/src/engine/metrics.ts`, `server/src/engine/portfolio-engine.ts`, and `docs/PortfolioEngine.md` plus `docs/DATA_PIPELINE.md`. Run `pnpm test:all` and property tests under `server/tests`, and consider the stress harness (`node server/scripts/stress-queries.ts`).
- **UX/frontend tasks**: Align copy with `docs/UX_GUIDE.md` and component patterns in `docs/Frontend.md`. Run `pnpm lint`, `pnpm typecheck`, `pnpm test:all`, and Playwright smoke tests (`pnpm e2e`) when UI routing is affected.
- **QA tasks**: Consult `docs/QA_WEAKNESSES.md`, `docs/DevWorkflow.md`, and e2e notes in `e2e/`. Standard commands: `pnpm lint`, `pnpm typecheck`, `pnpm test:all`; add `pnpm e2e` and `node server/scripts/stress-queries.ts` where relevant.
