import { TRPCError } from "@trpc/server";

import type { AuthUser } from "./types";

export interface AccessGrant {
  scope: "single-tenant";
  role: AuthUser["role"] | undefined;
}

export async function listAccessibleWorkspaceIds(_user: AuthUser): Promise<Set<number>> {
  return new Set();
}

export async function resolveWorkspaceAccess(user: AuthUser): Promise<AccessGrant> {
  if (!user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Authentication required" });
  }
  return { scope: "single-tenant", role: user.role };
}

export async function requireWorkspaceAccess(user: AuthUser): Promise<AccessGrant> {
  return resolveWorkspaceAccess(user);
}
