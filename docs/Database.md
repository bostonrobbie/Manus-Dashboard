# Database

- **ORM**: Drizzle ORM with PostgreSQL (`drizzle-orm/node-postgres`).
- **Schema**: Defined in `drizzle/schema.ts` with `users`, `strategies`, `trades`, and `benchmarks` tables plus a `strategy_type` enum.
- **Migrations**: Stored in `drizzle/migrations`. Configure credentials in `.env` and run `pnpm ts-node scripts/migrate.ts` to execute migrations.
- **Config**: `drizzle.config.ts` sets the schema entry point and migration output directory.

The analytics engine automatically falls back to in-memory sample data when a database connection string is not present, allowing the dashboard to function in environments without PostgreSQL while preserving schema compatibility for production.
