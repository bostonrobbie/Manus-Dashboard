# AI Contributor Guidelines

- Use pnpm-based scripts; prefer `pnpm -r test` or workspace-specific commands over npm/yarn.
- Keep changes within `client/`, `server/`, `shared/`, `drizzle/`, and `docs/`; `app/` is legacy and should not be modified unless explicitly requested.
- When touching authentication or data flows, add or update documentation under `docs/` and keep README instructions consistent.
- Favor TypeScript strictness and avoid introducing global mutable state; prefer dependency-injected contexts for API layers.
- Tests and typing checks should be run from the repository root or workspace scope; record executed commands in the final summary.
