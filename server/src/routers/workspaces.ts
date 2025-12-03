import { router, authedProcedure } from "@server/trpc/router";

export const workspacesRouter = router({
  list: authedProcedure.query(async ({ ctx }) => {
    return ctx.user?.id ? [{ id: 1, name: "Default", externalId: "default" }] : [];
  }),
});
