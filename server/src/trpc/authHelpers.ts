import { TRPCError } from "@trpc/server";

import { createLogger } from "@server/utils/logger";
import { isAdmin } from "@server/auth/roles";
import type { Context } from "./context";

const authLogger = createLogger("auth-guards");

export function requireUser(ctx: Context) {
  if (!ctx.user) {
    authLogger.warn("Unauthenticated access blocked", {
      endpoint: ctx.req?.url,
      mode: ctx.auth.mode,
      timestamp: new Date().toISOString(),
    });
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Authentication required" });
  }
  return ctx.user;
}

export function requireAdmin(ctx: Context) {
  const user = requireUser(ctx);
  const role = (user as any).role;
  const allowed = role === "OWNER" || role === "ADMIN" || isAdmin(user);
  if (!allowed) {
    authLogger.warn("Forbidden admin access attempt", {
      endpoint: ctx.req?.url,
      userId: user.id,
      userRole: role,
      timestamp: new Date().toISOString(),
    });
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin privileges required" });
  }
  return user;
}
