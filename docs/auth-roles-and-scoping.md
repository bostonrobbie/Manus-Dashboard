# Auth roles and owner scoping

This pass introduces explicit user roles and owner-level data isolation for the Manus dashboard backend.

## Roles
- **OWNER**: Full control over the deployment. Can manage all data and access admin-only APIs.
- **ADMIN**: Elevated rights similar to OWNER for admin operations, but reserved for delegated administrators.
- **USER**: Standard account; can read/write only their own portfolio data.
- **VIEWER**: Read-only access scoped to their own data.

### Default role assignment
- On first sign-in to an empty database, the first user is created with role **OWNER**.
- Subsequent users default to **USER** unless promoted manually to ADMIN/OWNER.
- Auth records are keyed by email/provider; sign-ins update or create rows in `users`.

## Owner scoping
- Portfolio tables now carry `ownerId` that references `users.id`:
  - `strategies`, `trades`, `benchmarks`, and `upload_logs`.
- All portfolio-related routers (overview, summaries, analytics, uploads) enforce `ownerId = ctx.user.id`.
- Mutations set `ownerId` on the server side from the authenticated user; clients do not supply owner identifiers.

### Admin-only operations
- Admin endpoints (e.g., `adminData` soft-deletes) require `role` of OWNER or ADMIN.
- Unauthorized attempts are logged with endpoint, userId, and role for auditability.

## QA checklist
- Create two users with distinct emails (User A and User B).
  - Upload or seed trades for each user separately.
  - Confirm the Home dashboard shows different P&L for A vs B and no cross-visibility.
- Call portfolio endpoints without authentication → expect UNAUTHORIZED.
- Attempt adminData routes as USER → expect FORBIDDEN; as OWNER/ADMIN → succeeds.
- Break the portfolio engine intentionally and call `system.status`; it should not leak user data and should log the failure while keeping DB check status.
