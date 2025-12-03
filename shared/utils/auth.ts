import type { SharedAuthUser } from "@shared/types/auth";

const ADMIN_ROLE_CLAIMS = ["admin", "superuser", "platform-admin", "org-admin"];

/**
 * Determine whether a user should be treated as an admin.
 *
 * Roles may be provided directly from Manus headers (roles/permissions) or other
 * auth sources. The check is intentionally permissive for any role that either
 * matches a known admin string or contains the substring "admin".
 */
export function isAdminUser(user: Pick<SharedAuthUser, "roles"> | null | undefined): boolean {
  if (!user?.roles || user.roles.length === 0) return false;

  const normalized = user.roles
    .map(role => role?.toString().trim().toLowerCase())
    .filter((role): role is string => Boolean(role));

  return normalized.some(role => ADMIN_ROLE_CLAIMS.includes(role) || role.includes("admin"));
}

export function getWorkspaceRole() {
  return "viewer" as const;
}

export function isWorkspaceOwner() {
  return false;
}

export function canWriteToWorkspace() {
  return false;
}
