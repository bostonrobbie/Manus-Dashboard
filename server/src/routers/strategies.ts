/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { router, authedProcedure } from "@server/trpc/router";
import { loadStrategies } from "@server/engine/portfolio-engine";
import { requireWorkspaceAccess } from "@server/auth/workspaceAccess";
import { requireUser } from "@server/trpc/authHelpers";

export const strategiesRouter = router({
  list: authedProcedure.query(async ({ ctx }) => {
    const user = requireUser(ctx as any);
    const { workspace } = await requireWorkspaceAccess(user, "read");
    return loadStrategies({ userId: user.id, ownerId: user.id, workspaceId: workspace?.id ?? user.workspaceId });
  }),
});
