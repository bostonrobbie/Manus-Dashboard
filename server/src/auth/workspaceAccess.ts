import { TRPCError } from "@trpc/server";

import type { AuthUser } from "./types";

export interface WorkspaceAccess {
  workspace: null;
  membership: null;
  role: "viewer";
}

export async function listAccessibleWorkspaceIds(_user: AuthUser): Promise<Set<number>> {
  return new Set();
}

export async function resolveWorkspaceAccess(_user: AuthUser): Promise<WorkspaceAccess> {
  throw new TRPCError({ code: "FORBIDDEN", message: "Workspace functionality is not supported on Manus." });
}

export async function requireWorkspaceAccess(user: AuthUser): Promise<WorkspaceAccess> {
  return resolveWorkspaceAccess(user);
}
