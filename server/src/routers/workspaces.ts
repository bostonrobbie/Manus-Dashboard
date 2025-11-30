import { inArray } from "drizzle-orm";

import { getDb, schema } from "@server/db";
import { router, authedProcedure } from "@server/trpc/router";
import { listAccessibleWorkspaceIds } from "@server/auth/workspaceAccess";

export const workspacesRouter = router({
  list: authedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    const accessible = await listAccessibleWorkspaceIds(ctx.user);

    if (!db || accessible.size === 0) {
      return ctx.user?.workspaceId
        ? [{ id: ctx.user.workspaceId, name: `Workspace ${ctx.user.workspaceId}`, externalId: String(ctx.user.workspaceId) }]
        : [];
    }

    const baseQuery = db
      .select({
        id: schema.workspaces.id,
        name: schema.workspaces.name,
        externalId: schema.workspaces.externalId,
        ownerUserId: schema.workspaces.ownerUserId,
      })
      .from(schema.workspaces);

    const rows = await baseQuery.where(inArray(schema.workspaces.id, Array.from(accessible)));

    if (rows.length === 0 && ctx.user.workspaceId != null) {
      return [{ id: ctx.user.workspaceId, name: `Workspace ${ctx.user.workspaceId}`, externalId: String(ctx.user.workspaceId) }];
    }

    return rows;
  }),
});
