import { TRPCError, initTRPC } from "@trpc/server";

import { createLogger } from "../utils/logger";
import type { Context } from "./context";

const logger = createLogger("trpc");

export const trpcErrorFormatter = ({ shape, error }: { shape: any; error: TRPCError }) => {
  const isAuthError = error.code === "UNAUTHORIZED" || error.code === "FORBIDDEN";
  if (!isAuthError && error.code !== "BAD_REQUEST") {
    logger.error("tRPC error", { code: error.code, message: error.message });
  }

  return {
    ...shape,
    message: isAuthError ? error.message : "Internal server error",
    data: {
      ...shape.data,
      code: error.code,
      auth: isAuthError,
      reason: (error.cause as any)?.reason,
    },
  };
};

const t = initTRPC.context<Context>().create({
  errorFormatter: trpcErrorFormatter,
});

export const router = t.router;
export const publicProcedure = t.procedure;

const enforceUser = t.middleware(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Authentication required" });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
});

export const protectedProcedure = t.procedure.use(enforceUser);

export function requireUser(ctx: Context) {
  if (!ctx.user) {
    logger.warn("Unauthenticated access blocked", {
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
  const role = user.role;
  const isAdminRole = role === "admin" || user.roles?.some(r => r?.toLowerCase().includes("admin"));
  if (!isAdminRole) {
    logger.warn("Forbidden admin access attempt", {
      endpoint: ctx.req?.url,
      userId: user.id,
      userRole: role,
      timestamp: new Date().toISOString(),
    });
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin privileges required" });
  }
  return user;
}
