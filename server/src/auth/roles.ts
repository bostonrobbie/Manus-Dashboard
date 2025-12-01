import type { AuthUser } from "./types";
import type { UserRole } from "@shared/types/auth";

const ADMIN_ROLE_CLAIMS = ["admin", "owner", "superuser", "platform-admin", "workspace-admin", "org-admin"];

export function isAdmin(user: AuthUser | null | undefined): boolean {
  if (!user) return false;
  if (hasElevatedRole((user as any).role)) return true;
  if (!user.roles || user.roles.length === 0) return false;

  const normalized = user.roles
    .map(role => role?.toString().trim().toLowerCase())
    .filter((role): role is string => Boolean(role));

  return normalized.some(role => ADMIN_ROLE_CLAIMS.includes(role) || role.includes("admin"));
}

export const hasElevatedRole = (role?: UserRole | null) => role === "OWNER" || role === "ADMIN";
