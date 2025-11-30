import type { Request } from "express";
import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";

import { env } from "@server/utils/env";
import { parseManusUser } from "./manusAdapter";
import type { AuthContext, AuthUser } from "./types";

export const MOCK_AUTH_USER: AuthUser = {
  id: 1,
  email: "local@test",
  name: "Local Dev",
  workspaceId: 1,
  roles: ["mock"],
  source: "local",
};

export const MANUS_FALLBACK_USER: AuthUser = {
  id: -1,
  email: "mock@manus.local",
  name: "Manus Mock",
  workspaceId: -1,
  roles: ["mock"],
  source: "manus",
};

export function resolveAuth(req: Request): AuthContext {
  const manusResult = parseManusUser(req);
  const manusMode = env.manusMode || Boolean(manusResult.user);

  if (manusResult.user) {
    return { mode: "manus", user: manusResult.user, mock: false, fallbackUsed: false, strict: env.manusAuthStrict };
  }

  if (manusMode && !env.manusAuthStrict && env.manusAllowMockOnAuthFailure) {
    return { mode: "manus", user: MANUS_FALLBACK_USER, mock: true, fallbackUsed: true, strict: env.manusAuthStrict };
  }

  if (env.mockUserEnabled) {
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
  return { req: opts.req, res: opts.res, auth, user: auth.user };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
