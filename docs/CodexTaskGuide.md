# Codex Task Guide

- Respect the workspace layout (`client`, `server`, `shared`, `drizzle`, `scripts`).
- Keep shared types in `shared/` and import them via the configured path aliases.
- Avoid try/catch around imports and prefer deterministic pure functions inside the portfolio engine.
- Use `pnpm` for all installs and scripts.
- When adding routes, surface them through `server/src/routers` and expose Zod schemas for inputs.
- Keep the `/health` endpoint intact for platform checks.
- Prefer type-safe data flow via tRPC hooks instead of manual fetch calls on the client.
