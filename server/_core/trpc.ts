import { TRPCError, initTRPC } from "@trpc/server";

import { captureException } from "../monitoring/monitor";
import { createLogger } from "../utils/logger";
import type { Context } from "./context";

const logger = createLogger("trpc");

export const trpcErrorFormatter = ({ shape, error }: { shape: any; error: TRPCError }) => {
  const isAuthError = error.code === "UNAUTHORIZED" || error.code === "FORBIDDEN";
  const isClientError = isAuthError || error.code === "BAD_REQUEST";
  const reason = (error.cause as any)?.reason ?? (error.cause instanceof Error ? error.cause.message : undefined);

  return {
    ...shape,
    message: isClientError ? error.message : "Internal server error",
    data: {
      ...shape.data,
      code: error.code,
      auth: isAuthError,
      reason,
    },
  };
};

const t = initTRPC.context<Context>().create({
  errorFormatter: trpcErrorFormatter,
});

const errorHandlingMiddleware = t.middleware(async ({ ctx, next, path }) => {
  try {
    return await next();
  } catch (err) {
    const error = err as Error;
    const meta = {
      endpoint: path,
      userId: ctx.user?.id,
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    };

    logger.error("tRPC endpoint failed", meta);
    captureException(error, { endpoint: path, userId: ctx.user?.id });

    if (error instanceof TRPCError) {
      throw new TRPCError({
        code: error.code,
        message: error.message,
        cause: error.cause ?? error,
      });
    }

    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Internal server error", cause: error });
  }
});

export const router = t.router;
const baseProcedure = t.procedure.use(errorHandlingMiddleware);
export const publicProcedure = baseProcedure;

const enforceUser = t.middleware(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Authentication required" });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
});

export const protectedProcedure = baseProcedure.use(enforceUser);

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
