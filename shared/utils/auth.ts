import type { SharedAuthUser, WorkspaceRole } from "@shared/types/auth";
import type { WorkspaceSummary } from "@shared/types/workspace";

const ADMIN_ROLE_CLAIMS = ["admin", "owner", "superuser", "platform-admin", "workspace-admin", "org-admin"];

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

const WORKSPACE_ROLE_ORDER: WorkspaceRole[] = ["viewer", "editor", "admin", "owner"];

export function getWorkspaceRole(
  user: Pick<SharedAuthUser, "id" | "workspaceRole" | "workspaceId"> | null | undefined,
  workspace: Pick<WorkspaceSummary, "id"> & { ownerUserId?: number | null },
): WorkspaceRole {
  if (!user) return "viewer";
  if (workspace.ownerUserId != null && workspace.ownerUserId === user.id) return "owner";
  return user.workspaceId === workspace.id ? user.workspaceRole ?? "viewer" : "viewer";
}

export function isWorkspaceOwner(
  user: Pick<SharedAuthUser, "id"> | null | undefined,
  workspace: Pick<WorkspaceSummary, "id"> & { ownerUserId?: number | null },
): boolean {
  if (!user) return false;
  return workspace.ownerUserId != null && workspace.ownerUserId === user.id;
}

export function canWriteToWorkspace(role: WorkspaceRole | null | undefined): boolean {
  if (!role) return false;
  return WORKSPACE_ROLE_ORDER.indexOf(role) >= WORKSPACE_ROLE_ORDER.indexOf("editor");
}
