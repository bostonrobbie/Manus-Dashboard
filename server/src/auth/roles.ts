import type { AuthUser } from "./types";

const ADMIN_ROLE_CLAIMS = ["admin", "owner", "superuser", "platform-admin", "workspace-admin", "org-admin"];

export function isAdmin(user: AuthUser | null | undefined): boolean {
  if (!user?.roles || user.roles.length === 0) return false;

  const normalized = user.roles
    .map(role => role?.toString().trim().toLowerCase())
    .filter((role): role is string => Boolean(role));

  return normalized.some(role => ADMIN_ROLE_CLAIMS.includes(role) || role.includes("admin"));
}
