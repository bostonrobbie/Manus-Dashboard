# Database

- **Engine/ORM**: PostgreSQL via Drizzle ORM (`drizzle-orm/node-postgres`).
- **Schema**: Defined in `drizzle/schema.ts` with `users`, `strategies`, `trades`, and `benchmarks` tables plus a `strategy_type` enum.
- **Connection**: `DATABASE_URL` should be a standard Postgres URI (e.g., `postgresql://user:password@host:5432/dbname`).
- **Migrations**: Stored in `drizzle/migrations`. Run `pnpm --filter drizzle run migrate` from the repo root to apply them against `DATABASE_URL` using `drizzle.config.cjs`.
- **Health**: `GET /health` issues a lightweight `select 1` via the shared Drizzle client. It returns `{ "status": "ok", "db": "up" }` on success or `{ "status": "degraded", "db": "down" }` with HTTP 503 if the database is unreachable.

The analytics engine automatically falls back to in-memory sample data when a database connection string is not present, allowing the dashboard to function in environments without PostgreSQL while preserving schema compatibility for production.
