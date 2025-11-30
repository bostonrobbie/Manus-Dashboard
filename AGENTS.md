# AI Contributor Guidelines

- Use pnpm-based scripts; prefer `pnpm -r test` or workspace-specific commands over npm/yarn.
- Keep changes within `client/`, `server/`, `shared/`, `drizzle/`, and `docs/`; `app/` is legacy and should not be modified unless explicitly requested.
- When touching authentication or data flows, add or update documentation under `docs/` and keep README instructions consistent.
- Favor TypeScript strictness and avoid introducing global mutable state; prefer dependency-injected contexts for API layers.
- Tests and typing checks should be run from the repository root or workspace scope; record executed commands in the final summary.
- Treat the following as contract files—avoid changing them unless explicitly instructed and double-check any edits: `drizzle/schema.ts`, migrations under `drizzle/`, `server/src/config/manus.ts`, `docs/MANUS_CONTRACT_CHECKLIST.md`, and `pnpm-workspace.yaml`.
- Before submitting changes: run `pnpm --filter server test`, `pnpm --filter server build`, `pnpm --filter client build`, and `pnpm smoke:test`, and summarize the results.
