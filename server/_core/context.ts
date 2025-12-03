import type { Request } from "express";
import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";

import type { SharedAuthUser, UserRole, ViewerState } from "@shared/types/auth";
import { env } from "../utils/env";

const MOCK_USER: SharedAuthUser = {
  id: 1,
  email: "local@test",
  name: "Local Dev",
  roles: ["admin"],
  role: "admin",
  source: "local",
};

const parseSerializedUser = (raw: string): Partial<SharedAuthUser> | null => {
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") return parsed as Partial<SharedAuthUser>;
  } catch {
    // ignore
  }

  const isLikelyBase64 = /^[A-Za-z0-9+/=]+$/;
  if (isLikelyBase64.test(raw)) {
    try {
      const decoded = Buffer.from(raw, "base64").toString("utf-8");
      return parseSerializedUser(decoded);
    } catch {
      // ignore
    }
  }

  const parts = raw.split(":");
  if (parts.length >= 2) {
    const id = Number(parts[0]);
    const email = parts[1];
    if (Number.isFinite(id) && email) {
      return { id, email };
    }
  }

  return null;
};

const inferRole = (user: Partial<SharedAuthUser>): UserRole => {
  const explicitRole = user.role as UserRole | undefined;
  if (explicitRole === "admin") return "admin";

  const hasAdminRole = user.roles?.some(role => role?.toLowerCase().includes("admin"));
  return hasAdminRole ? "admin" : "user";
};

const readHeaderValue = (req: Request, names: string[]): string | undefined => {
  for (const name of names) {
    const value = req.headers[name];
    if (value != null) return Array.isArray(value) ? value[0] : String(value);
  }
  return undefined;
};

const parseUserFromRequest = (req: Request): SharedAuthUser | null => {
  const headerNames = [
    env.manusAuthHeaderUser,
    env.manusAuthHeaderUser.replace(/_/g, "-"),
    "x-manus-user-json",
    "x-manus-user",
  ];
  const rawHeader = readHeaderValue(req, headerNames);
  if (!rawHeader) return null;

  const parsed = parseSerializedUser(rawHeader);
  if (!parsed?.id || !parsed.email) return null;

  const role = inferRole(parsed);
  return {
    id: Number(parsed.id),
    email: String(parsed.email),
    name: parsed.name ?? undefined,
    roles: parsed.roles,
    role,
    source: "manus",
    authProvider: parsed.authProvider,
    authProviderId: parsed.authProviderId,
  } satisfies SharedAuthUser;
};

export async function createContext(opts: CreateExpressContextOptions) {
  let user = parseUserFromRequest(opts.req);
  let mock = false;

  if (!user && env.mockUserEnabled) {
    user = MOCK_USER;
    mock = true;
  }

  const viewerState: ViewerState = {
    user,
    mode: user?.source === "manus" ? "manus" : "local",
    mock,
    fallbackUsed: false,
    strict: env.manusAuthStrict,
  };

  return { req: opts.req, res: opts.res, user, auth: viewerState };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
