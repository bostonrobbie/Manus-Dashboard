# Manus Handoff

## Purpose
This dashboard is a Manus-native trading analytics surface. Manus handles Google sign-in and injects user/workspace headers so the service can enforce tenancy while computing workspace analytics.

## Required configuration
- Set Manus env flags: `MANUS_MODE=true`, `MANUS_AUTH_STRICT=true` (or `MANUS_AUTH_STRICT=1`), and keep `MOCK_USER_ENABLED=false` in production.
- Auth headers: `MANUS_USER_HEADER` (default `x-manus-user-json`) carrying serialized user JSON, and `MANUS_WORKSPACE_HEADER` (default `x-manus-workspace-id`) carrying the active workspace ID. Optional role header `MANUS_AUTH_HEADER_ROLES` can pass additional claims.
- Expected user JSON fields: `id`, `email`, optional `name`, `roles` (string array), `workspaceId` or `default_workspace` from Manus, and `workspaceRole` if available.
- Database: `DATABASE_URL` for PostgreSQL plus any connection pool settings your Manus runtime expects.

## Deployment steps on Manus
1. Install dependencies with `pnpm install` in build stage.
2. Build and start: `pnpm run build` then `pnpm start` (server default port 3001) or use the provided Procfile equivalents.
3. Configure Manus headers so upstream proxies send `x-manus-user-json` and `x-manus-workspace-id` to this service. Preserve case-insensitive names; the backend lowercases header keys before parsing.
4. Apply migrations: `pnpm drizzle:push` (or your standard migration runner) against the target database. Seed demo data with `pnpm run seed` if you want synthetic workspaces for validation.

## Validation checklist
- Hit `/health` and `/health/full` to confirm DB + Manus readiness; both should return `status=ok` in Manus mode.
- Hit `/version` to verify build metadata and version tracking.
- Optionally run smoke/stress: `pnpm smoke:test` if the API is running, and `node server/scripts/stress-queries.ts` for quick load validation.
- Manually verify the UI:
  - Overview page loads for a test Manus user bound to a workspace.
  - RBAC enforcement: viewer cannot upload or delete; owner/admin can access Admin Data Manager and perform soft deletes.

## Support and extension
- See [docs/DOMAIN_MODEL.md](./DOMAIN_MODEL.md) for tables, keys, and entity relationships.
- See [docs/ARCHITECTURE.md](./ARCHITECTURE.md) for request flow, routers, and analytics layout.
- DEPLOY_ON_MANUS.md and MANUS_CONTRACT_CHECKLIST.md remain the source of truth for contractual settings.
