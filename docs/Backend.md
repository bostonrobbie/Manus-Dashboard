# Backend

- **Stack**: Node 18+, Express, tRPC, Drizzle ORM (PostgreSQL), Zod.
- **Entrypoint**: `server/index.ts` boots Express, mounts the `/trpc` adapter, and exposes `/health`.
- **Routers**: Defined in `server/routers`:
  - `portfolio` for equity curves, drawdowns, strategy comparison, and trades.
  - `analytics` for high-level KPIs.
  - `strategies` to list known strategies.
- **Context**: `server/_core/context.ts` injects Manus-authenticated users and mock fallbacks for local development.
- **Engine**: `server/portfolio-engine.ts` provides deterministic analytics with optional database reads and a built-in sample dataset.

Start the server with `pnpm --filter server dev` and point the client to the same host to share cookies and relative paths.
