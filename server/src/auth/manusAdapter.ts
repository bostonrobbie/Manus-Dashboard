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
  roles?: string[];
  permissions?: string[];
  orgId?: string | number;
  parsedUser?: ManusParsedUser;
  [key: string]: unknown;
};

type ManusParsedUser = {
  id?: string | number;
  userId?: string | number;
  sub?: string | number;
  email?: string;
  name?: string;
  roles?: string[];
  permissions?: string[];
  [key: string]: unknown;
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
      const candidate = (parsed as ManusClaims).parsedUser && typeof (parsed as ManusClaims).parsedUser === "object"
        ? ((parsed as ManusClaims).parsedUser as ManusParsedUser)
        : (parsed as ManusParsedUser);
      const rolesCandidate =
        Array.isArray(candidate.roles)
          ? candidate.roles
          : Array.isArray((candidate as any).permissions)
            ? ((candidate as any).permissions as string[])
            : undefined;
    const id =
      parseUserId(candidate.sub ?? candidate.userId ?? (candidate as any).id) ??
      parseUserId((candidate as any).user_id);
    return {
      id: id ?? undefined,
      email: candidate.email ?? (candidate as any).user_email ?? (candidate as any).mail,
      name: (candidate as ManusClaims).name as string | undefined,
      roles: rolesCandidate,
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
  headerNames: string[];
}

const recordFailure = (headerNames: string[], authHeaderPresent: boolean) => {
  if (!env.manusMode) return;
  if (manusFailureLogCount >= MAX_FAILURE_LOGS) return;

  manusFailureLogCount += 1;
  logger.warn("Unable to resolve Manus user from headers", {
    mode: "MANUS",
    authHeaderPresent,
    configuredUserHeader: env.manusAuthHeaderUser,
    headerNames: headerNames.filter(name => name.startsWith("x-")),
  });
};

export function parseManusUser(req: Request): ManusParseResult {
  const headerNames = Object.keys(req.headers ?? {}).map(name => name.toLowerCase());
  const userHeaderCandidates = Array.from(
    new Set([
      env.manusAuthHeaderUser,
      env.manusAuthHeaderUser.replace(/_/g, "-"),
      "x-manus-user",
      "x-manus-user-json",
    ]),
  );
  const rolesHeaderCandidates = env.manusAuthHeaderRoles
    ? Array.from(new Set([env.manusAuthHeaderRoles, env.manusAuthHeaderRoles.replace(/_/g, "-")]))
    : [];

  const getHeaderValue = (candidates: string[]) => {
    for (const key of candidates) {
      const value = req.headers?.[key];
      if (value != null) return Array.isArray(value) ? value[0] : value;
    }
    return undefined;
  };

  const rawHeader = getHeaderValue(userHeaderCandidates);
  const rawRoles = getHeaderValue(rolesHeaderCandidates);

  if (!rawHeader) {
    recordFailure(headerNames, Boolean(rawHeader));
    return { user: null, authHeaderPresent: false, headerNames };
  }

  const headerString = String(rawHeader);
  const parsedRoles = Array.isArray(rawRoles)
    ? (rawRoles as unknown as string[])
    : typeof rawRoles === "string"
      ? (() => {
          try {
            const asJson = JSON.parse(rawRoles);
            if (Array.isArray(asJson)) return asJson.map(r => String(r));
          } catch {
            // not json
          }
          return rawRoles
            .split(",")
            .map(role => role.trim())
            .filter(Boolean);
        })()
      : undefined;

  if (env.manusJwtSecret && headerString.startsWith("Bearer ")) {
    const token = headerString.slice("Bearer ".length);
    try {
      const decoded = jwt.verify(token, env.manusJwtSecret) as ManusClaims;
      const claims = decoded.parsedUser && typeof decoded.parsedUser === "object" ? decoded.parsedUser : decoded;
      const id =
        parseUserId(claims.sub) ??
        parseUserId((claims as any).userId as any) ??
        parseUserId((claims as any).uid as any) ??
        parseUserId((claims as any).id as any);
      if (id == null) {
        recordFailure(headerNames, true);
        return { user: null, authHeaderPresent: true, headerNames };
      }
      return {
        user: {
          id,
          email: (claims as ManusClaims).email ?? "unknown@manus",
          name: (claims as ManusClaims).name,
          roles: Array.isArray((claims as ManusClaims).roles)
            ? ((claims as ManusClaims).roles as string[])
            : Array.isArray((claims as ManusClaims).permissions)
              ? ((claims as ManusClaims).permissions as string[])
              : parsedRoles,
          source: "manus",
        },
        authHeaderPresent: true,
        headerNames,
      };
    } catch (error) {
      logger.warn("Unable to verify Manus token", { error: (error as Error).message });
      recordFailure(headerNames, true);
      return { user: null, authHeaderPresent: true, headerNames };
    }
  }

  const serialized = coerceUserFromSerialized(headerString);
  if (serialized?.id != null && serialized.email) {
    return {
      user: {
        id: serialized.id,
        email: serialized.email,
        name: serialized.name,
        roles: serialized.roles ?? parsedRoles,
        source: "manus",
      },
      authHeaderPresent: true,
      headerNames,
    };
  }

  const fallbackId = parseUserId(headerString);
  if (fallbackId != null) {
    return {
      user: {
        id: fallbackId,
        email: "unknown@manus",
        source: "manus",
      },
      authHeaderPresent: true,
      headerNames,
    };
  }

  recordFailure(headerNames, true);
  return { user: null, authHeaderPresent: true, headerNames };
}
