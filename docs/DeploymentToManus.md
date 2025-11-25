# Deployment to Manus

1. Set environment variables (see `.env.example`). At minimum define `PORT` and `DATABASE_URL` for PostgreSQL.
2. Install dependencies: `pnpm install`.
3. Run migrations if a database is available: `pnpm ts-node scripts/migrate.ts`.
4. Build packages: `pnpm run build` (runs both client and server builds).
5. Start the server: `pnpm --filter server start`. Serve the static client separately via Vite preview or a CDN, pointing it at the same host where `/trpc` is available.

The server exposes `/health` for Manus health checks. Deployment tooling can call this endpoint to verify readiness.
