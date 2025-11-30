import { TRPCError, initTRPC } from "@trpc/server";

import { createLogger } from "@server/utils/logger";
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

export const authedProcedure = t.procedure.use(enforceUser);
