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

export function resolveAuth(req: Request): AuthContext {
  const manusUser = parseManusUser(req);
  const manusMode = env.manusMode || Boolean(manusUser);

  if (manusUser) {
    return { mode: "manus", user: manusUser, mock: false };
  }

  if (env.mockUserEnabled) {
    return { mode: manusMode ? "manus" : "local", user: MOCK_AUTH_USER, mock: true };
  }

  return { mode: manusMode ? "manus" : "local", user: null, mock: false };
}

export async function createContext(opts: CreateExpressContextOptions) {
  const auth = resolveAuth(opts.req);
  return { req: opts.req, res: opts.res, auth, user: auth.user };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
