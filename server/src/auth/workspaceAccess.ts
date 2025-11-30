import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";

import { getDb, schema } from "@server/db";
import type { AuthUser } from "./types";
import type { WorkspaceRole } from "@shared/types/auth";
import { isAdmin } from "./roles";

type WorkspaceRow = typeof schema.workspaces.$inferSelect;
type WorkspaceMemberRow = typeof schema.workspaceMembers.$inferSelect;

export interface WorkspaceAccess {
  workspace: WorkspaceRow | null;
  membership: WorkspaceMemberRow | null;
  role: WorkspaceRole;
}

const canWriteToWorkspace = (role: WorkspaceRole | null | undefined) =>
  role === "owner" || role === "admin" || role === "editor";

export async function listAccessibleWorkspaceIds(user: AuthUser): Promise<Set<number>> {
  const db = await getDb();
  const ids = new Set<number>();
  if (user.workspaceId != null) ids.add(user.workspaceId);

  if (!db) return ids;

  if (user.id) {
    const memberships = await db
      .select({ workspaceId: schema.workspaceMembers.workspaceId })
      .from(schema.workspaceMembers)
      .where(eq(schema.workspaceMembers.userId, user.id));
    memberships.forEach((member: { workspaceId: number }) => ids.add(member.workspaceId));
  }

  if (user.id) {
    const owned = await db
      .select({ workspaceId: schema.workspaces.id })
      .from(schema.workspaces)
      .where(eq(schema.workspaces.ownerUserId, user.id));
    owned.forEach((row: { workspaceId: number }) => ids.add(row.workspaceId));
  }

  return ids;
}

export async function resolveWorkspaceAccess(user: AuthUser): Promise<WorkspaceAccess> {
  const workspaceId = user.workspaceId;
  if (workspaceId == null) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Workspace not specified for user" });
  }

  const db = await getDb();
  if (!db) {
    return { workspace: null, membership: null, role: user.workspaceRole ?? "owner" };
  }

  const [workspace] = await db.select().from(schema.workspaces).where(eq(schema.workspaces.id, workspaceId));
  if (!workspace) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Workspace not found" });
  }

  const [membership] = await db
    .select()
    .from(schema.workspaceMembers)
    .where(and(eq(schema.workspaceMembers.workspaceId, workspaceId), eq(schema.workspaceMembers.userId, user.id)));

  let role: WorkspaceRole = "viewer";
  if (workspace.ownerUserId === user.id) {
    role = "owner";
  } else if (membership?.role) {
    role = normalizeWorkspaceRole(membership.role);
  } else if (isAdmin(user)) {
    role = "admin";
  } else if (user.workspaceRole) {
    role = user.workspaceRole;
  }

  return { workspace, membership, role };
}

export async function requireWorkspaceAccess(
  user: AuthUser,
  intent: "read" | "write",
  workspaceId?: number,
): Promise<WorkspaceAccess> {
  const resolved = await resolveWorkspaceAccess({ ...user, workspaceId: workspaceId ?? user.workspaceId });
  const targetWorkspaceId = workspaceId ?? user.workspaceId;

  if (targetWorkspaceId && resolved.workspace && resolved.workspace.id !== targetWorkspaceId) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Workspace mismatch" });
  }

  if (intent === "write" && !canWriteToWorkspace(resolved.role)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Insufficient workspace role" });
  }

  if (intent === "read") {
    const allowed =
      resolved.role === "owner" ||
      resolved.role === "admin" ||
      resolved.role === "editor" ||
      Boolean(resolved.membership);
    if (!allowed) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Workspace membership required" });
    }
  }

  return resolved;
}

const normalizeWorkspaceRole = (role: string): WorkspaceRole => {
  const normalized = role.trim().toLowerCase();
  if (normalized === "owner") return "owner";
  if (normalized === "admin") return "admin";
  if (normalized === "editor") return "editor";
  return "viewer";
};
