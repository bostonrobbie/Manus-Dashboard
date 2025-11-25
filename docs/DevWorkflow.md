# Dev Workflow

1. Install dependencies: `pnpm install`.
2. Run type checks: `pnpm tsc` (delegates to each workspace).
3. Start the backend: `pnpm --filter server dev`.
4. Start the frontend: `pnpm --filter client dev`.
5. Run migrations (optional): `pnpm ts-node scripts/migrate.ts` when `DATABASE_URL` is configured.
6. Build for production: `pnpm run build`.

Tests are not included in this reconstruction but the portfolio engine is deterministic and covered by shared types to catch regressions through the type system.
