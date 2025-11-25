import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { webhooksRouter } from "./routers/webhooks";
import { portfolioRouter } from "./routers/portfolio";
import { tradesRouter } from "./routers/trades";
import { strategiesRouter } from "./routers/strategies";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // Trading dashboard routers
  webhooks: webhooksRouter,
  portfolio: portfolioRouter,
  trades: tradesRouter,
  strategies: strategiesRouter,
});

export type AppRouter = typeof appRouter;
