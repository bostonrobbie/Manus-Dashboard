import { protectedProcedure, router } from "../_core/trpc";

export const workspacesRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.user?.id ? [{ id: 1, name: "Default", externalId: "default" }] : [];
  }),
});
