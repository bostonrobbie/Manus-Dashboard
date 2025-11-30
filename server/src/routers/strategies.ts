import { router, authedProcedure } from "@server/trpc/router";
import { loadStrategies } from "@server/engine/portfolio-engine";

export const strategiesRouter = router({
  list: authedProcedure.query(async ({ ctx }) =>
    loadStrategies({ userId: ctx.user.id, workspaceId: ctx.user.workspaceId }),
  ),
});
