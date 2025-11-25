# Antigravity Setup

To mirror Manus locally or in staging:

1. Copy `.env.example` to `.env` and set `DATABASE_URL` to a reachable PostgreSQL instance. Leave it empty to run with sample data.
2. Run `pnpm install` at the repo root to hydrate all workspace dependencies.
3. In one terminal start the server: `pnpm --filter server dev`.
4. In another terminal start the client: `pnpm --filter client dev`.
5. Navigate to `http://localhost:5173`. The client will call `/trpc` on the same origin; when using a remote server, set `VITE_TRPC_URL` env and adapt `client/src/main.tsx` accordingly.

Health checks are available at `http://localhost:4000/health`.
