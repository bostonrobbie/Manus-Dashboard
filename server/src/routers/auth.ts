import { router, publicProcedure } from "@server/trpc/router";

export const authRouter = router({
  viewer: publicProcedure.query(({ ctx }) => ({
    user: ctx.user,
    mode: ctx.auth.mode,
    mock: ctx.auth.mock,
  })),
});
