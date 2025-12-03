import { eq, sql } from "drizzle-orm";

import { getDb, schema } from "@server/db";
import { createLogger } from "@server/utils/logger";
import type { UserRole } from "@shared/types/auth";
import type { AuthUser } from "./types";

const logger = createLogger("auth-user");

export interface ResolvedUserRecord {
  id: number;
  email: string;
  name?: string | null;
  role: UserRole;
  authProvider?: string | null;
  authProviderId?: string | null;
}

const normalizeEmail = (user: AuthUser) =>
  user.email?.trim() || `user-${user.id ?? "unknown"}@local.invalid`;

const normalizeRole = (role?: string | null): UserRole => {
  if (!role) return "user";
  const lower = role.toLowerCase();
  return lower === "admin" ? "admin" : "user";
};

export async function ensureUserRecord(authUser: AuthUser): Promise<ResolvedUserRecord | null> {
  const db = await getDb();
  if (!db) return null;

  const email = normalizeEmail(authUser);
  const provider = authUser.source ?? "manus";
  const providerId = authUser.id != null ? String(authUser.id) : authUser.email ?? undefined;

  const [existing] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, email));

  if (existing) {
    const normalizedRole = normalizeRole((existing as any).role);
    if ((existing as any).role !== normalizedRole) {
      await db
        .update(schema.users)
        .set({ role: normalizedRole })
        .where(eq(schema.users.id, (existing as any).id));
      logger.info("Adjusted user role to normalized value", { email, role: normalizedRole });
    }
    return {
      id: (existing as any).id,
      email: (existing as any).email,
      name: (existing as any).name,
      role: normalizedRole,
      authProvider: (existing as any).authProvider,
      authProviderId: (existing as any).authProviderId,
    };
  }

  const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(schema.users);
  const role: UserRole = Number(count) === 0 ? "admin" : "user";

  const createdId = Number(
    (await db
      .insert(schema.users)
      .values({
        openId: providerId ?? email,
        email,
        name: authUser.name,
        role,
        authProvider: provider,
        authProviderId: providerId,
      })
      .$returningId?.())?.[0] ?? 0,
  );

  const created: ResolvedUserRecord = {
    id: createdId,
    email,
    name: authUser.name,
    role,
    authProvider: provider,
    authProviderId: providerId,
  };

  logger.info("Created user record", { email, role });

  return {
    id: created.id,
    email: created.email,
    name: created.name,
    role: normalizeRole((created as any).role),
    authProvider: created.authProvider,
    authProviderId: created.authProviderId,
  };
}
