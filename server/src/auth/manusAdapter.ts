import type { Request } from "express";
import jwt from "jsonwebtoken";

import { env } from "@server/utils/env";
import { createLogger } from "@server/utils/logger";
import type { AuthUser } from "./types";

const logger = createLogger("auth");
const MAX_FAILURE_LOGS = 10;
let manusFailureLogCount = 0;

type ManusClaims = {
  sub?: string | number;
  email?: string;
  name?: string;
  workspaceId?: string | number;
  roles?: string[];
  [key: string]: unknown;
};

const parseWorkspaceId = (value?: string | number): number | undefined => {
  if (value == null) return undefined;
  const num = typeof value === "number" ? value : Number(value);
  return Number.isFinite(num) ? num : undefined;
};

const parseUserId = (value: string | number | undefined): number | null => {
  if (value == null) return null;
  const asNumber = typeof value === "number" ? value : Number(value);
  if (Number.isFinite(asNumber)) return asNumber;
  const asString = String(value).trim();
  const match = asString.match(/user:(\d+)/i);
  if (match) {
    const parsed = Number(match[1]);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const coerceUserFromSerialized = (raw: string): Partial<AuthUser> | null => {
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      return {
        id: parseUserId((parsed as ManusClaims).sub ?? (parsed as any).userId ?? (parsed as any).id) ?? undefined,
        email: (parsed as ManusClaims).email ?? (parsed as any).user_email ?? (parsed as any).mail,
        name: (parsed as ManusClaims).name as string | undefined,
        workspaceId: parseWorkspaceId((parsed as ManusClaims).workspaceId ?? (parsed as any).workspace_id),
        roles: Array.isArray((parsed as ManusClaims).roles)
          ? ((parsed as ManusClaims).roles as string[])
          : undefined,
      };
    }
  } catch {
    // not json
  }

  const isLikelyBase64 = /^[A-Za-z0-9+/=]+$/;
  if (isLikelyBase64.test(raw)) {
    try {
      const decoded = Buffer.from(raw, "base64").toString("utf-8");
      return coerceUserFromSerialized(decoded);
    } catch {
      // ignore
    }
  }

  const parts = raw.split(":");
  if (parts.length >= 2) {
    const id = parseUserId(parts[0]);
    const email = parts[1];
    if (id != null && email) {
      return { id, email };
    }
  }
  return null;
};

export interface ManusParseResult {
  user: AuthUser | null;
  authHeaderPresent: boolean;
  workspaceHeaderPresent: boolean;
  headerNames: string[];
}

const recordFailure = (headerNames: string[], authHeaderPresent: boolean, workspaceHeaderPresent: boolean) => {
  if (!env.manusMode) return;
  if (manusFailureLogCount >= MAX_FAILURE_LOGS) return;

  manusFailureLogCount += 1;
  logger.warn("Unable to resolve Manus user from headers", {
    mode: "MANUS",
    authHeaderPresent,
    workspaceHeaderPresent,
    configuredUserHeader: env.manusAuthHeaderUser,
    configuredWorkspaceHeader: env.manusAuthHeaderWorkspace,
    headerNames: headerNames.filter(name => name.startsWith("x-")),
  });
};

export function parseManusUser(req: Request): ManusParseResult {
  const headerNames = Object.keys(req.headers ?? {});
  const headerValue =
    req.headers[env.manusAuthHeaderUser] ?? req.headers[env.manusAuthHeaderUser.toLowerCase()];
  const workspaceHeader =
    req.headers[env.manusAuthHeaderWorkspace] ?? req.headers[env.manusAuthHeaderWorkspace.toLowerCase()];
  const rawHeader = Array.isArray(headerValue) ? headerValue[0] : headerValue;
  const rawWorkspace = Array.isArray(workspaceHeader) ? workspaceHeader[0] : workspaceHeader;

  if (!rawHeader) {
    recordFailure(headerNames, Boolean(rawHeader), Boolean(rawWorkspace));
    return { user: null, authHeaderPresent: false, workspaceHeaderPresent: Boolean(rawWorkspace), headerNames };
  }

  const headerString = String(rawHeader);
  const workspaceId = parseWorkspaceId(rawWorkspace as string | undefined);

  if (env.manusJwtSecret && headerString.startsWith("Bearer ")) {
    const token = headerString.slice("Bearer ".length);
    try {
      const decoded = jwt.verify(token, env.manusJwtSecret) as ManusClaims;
      const id =
        parseUserId(decoded.sub) ??
        parseUserId((decoded as any).userId as any) ??
        parseUserId((decoded as any).uid as any);
      if (id == null) {
        recordFailure(headerNames, true, Boolean(rawWorkspace));
        return { user: null, authHeaderPresent: true, workspaceHeaderPresent: Boolean(rawWorkspace), headerNames };
      }
      return {
        user: {
          id,
          email: decoded.email ?? "unknown@manus",
          name: decoded.name,
          workspaceId: parseWorkspaceId(decoded.workspaceId) ?? workspaceId,
          roles: Array.isArray(decoded.roles) ? decoded.roles : undefined,
          source: "manus",
        },
        authHeaderPresent: true,
        workspaceHeaderPresent: Boolean(rawWorkspace),
        headerNames,
      };
    } catch (error) {
      logger.warn("Unable to verify Manus token", { error: (error as Error).message });
      recordFailure(headerNames, true, Boolean(rawWorkspace));
      return { user: null, authHeaderPresent: true, workspaceHeaderPresent: Boolean(rawWorkspace), headerNames };
    }
  }

  const serialized = coerceUserFromSerialized(headerString);
  if (serialized?.id != null && serialized.email) {
    return {
      user: {
        id: serialized.id,
        email: serialized.email,
        name: serialized.name,
        workspaceId: serialized.workspaceId ?? workspaceId,
        roles: serialized.roles,
        source: "manus",
      },
      authHeaderPresent: true,
      workspaceHeaderPresent: Boolean(rawWorkspace),
      headerNames,
    };
  }

  const fallbackId = parseUserId(headerString);
  if (fallbackId != null) {
    return {
      user: {
        id: fallbackId,
        email: "unknown@manus",
        workspaceId,
        source: "manus",
      },
      authHeaderPresent: true,
      workspaceHeaderPresent: Boolean(rawWorkspace),
      headerNames,
    };
  }

  recordFailure(headerNames, true, Boolean(rawWorkspace));
  return { user: null, authHeaderPresent: true, workspaceHeaderPresent: Boolean(rawWorkspace), headerNames };
}
