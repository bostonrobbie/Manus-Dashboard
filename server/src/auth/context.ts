import type { Request } from "express";
import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";

import { env } from "@server/utils/env";
import { parseManusUser } from "./manusAdapter";
import type { AuthContext, AuthUser } from "./types";
import type { UserRole } from "@shared/types/auth";
import { ensureUserRecord } from "./userRecords";

export const MOCK_AUTH_USER: AuthUser = {
  id: 1,
  email: "local@test",
  name: "Local Dev",
  roles: ["mock"],
  source: "local",
};

export const MANUS_FALLBACK_USER: AuthUser = {
  id: -1,
  email: "mock@manus.local",
  name: "Manus Mock",
  roles: ["mock"],
  source: "manus",
};

export function resolveAuth(req: Request): AuthContext {
  const manusResult = parseManusUser(req);
  const manusMode = env.manusMode || Boolean(manusResult.user);

  if (manusResult.user) {
    return { mode: "manus", user: manusResult.user, mock: false, fallbackUsed: false, strict: env.manusAuthStrict };
  }

  if (manusMode) {
    if (!env.manusAuthStrict && env.manusAllowMockOnAuthFailure) {
      return { mode: "manus", user: MANUS_FALLBACK_USER, mock: true, fallbackUsed: true, strict: env.manusAuthStrict };
    }

    if (env.manusAuthStrict) {
      return { mode: "manus", user: null, mock: false, fallbackUsed: false, strict: env.manusAuthStrict };
    }
  }

  if (!manusMode && env.mockUserEnabled) {
    return {
      mode: manusMode ? "manus" : "local",
      user: MOCK_AUTH_USER,
      mock: true,
      fallbackUsed: false,
      strict: env.manusAuthStrict,
    };
  }

  return {
    mode: manusMode ? "manus" : "local",
    user: null,
    mock: false,
    fallbackUsed: false,
    strict: env.manusAuthStrict,
  };
}

export async function createContext(opts: CreateExpressContextOptions) {
  const auth = resolveAuth(opts.req);
  const inferredRole = inferRoleFromAuthUser(auth.user);
  let user = auth.user as (AuthUser & { role?: UserRole }) | null;

  if (auth.user) {
    const record = await ensureUserRecord(auth.user);
    if (record) {
      user = {
        ...auth.user,
        id: record.id,
        email: record.email,
        role: record.role,
        authProvider: record.authProvider ?? auth.user.source,
        authProviderId: record.authProviderId ?? undefined,
      };
    } else if (inferredRole) {
      user = { ...auth.user, role: inferredRole };
    }
  }

  return { req: opts.req, res: opts.res, auth, user };
}

export type Context = Awaited<ReturnType<typeof createContext>>;

const inferRoleFromAuthUser = (user: AuthUser | null): UserRole | undefined => {
  if (!user) return undefined;
  if (user.role) return user.role as UserRole;
  const fromRoles = user.roles?.find(role => role && role.toLowerCase().includes("admin"));
  if (fromRoles) return "admin";
  return undefined;
};
