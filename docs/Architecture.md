# Architecture

This monorepo uses pnpm workspaces to coordinate a React client and an Express + tRPC server. Shared TypeScript types live in the `shared/` package and are consumed by both runtimes through path aliases defined in `tsconfig.base.json`.

- **client/** – React 19 + Vite single-page dashboard that talks to the backend through tRPC.
- **server/** – Express server exposing a `/trpc` endpoint and a `/health` route. Business logic and analytics live in `server/src/engine` and are consumed by tRPC routers in `server/src/routers`.
- **drizzle/** – PostgreSQL schema and migrations managed via Drizzle ORM.
- **scripts/** – operational scripts such as the migration runner.
- **archive/** – preserved content from the original Manus export.

The system is intentionally small but production-ready: types are shared, the server can run without a database by using baked-in sample data, and the client renders the aggregated analytics using React Query-powered tRPC hooks.
