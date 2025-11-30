import { router, authedProcedure } from "@server/trpc/router";
import { loadStrategies } from "@server/engine/portfolio-engine";
import { requireWorkspaceAccess } from "@server/auth/workspaceAccess";

export const strategiesRouter = router({
  list: authedProcedure.query(async ({ ctx }) => {
    const { workspace } = await requireWorkspaceAccess(ctx.user, "read");
    return loadStrategies({ userId: ctx.user.id, workspaceId: workspace?.id ?? ctx.user.workspaceId });
  }),
});
