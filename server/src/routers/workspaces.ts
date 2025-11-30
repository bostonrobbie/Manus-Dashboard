import { and, eq } from "drizzle-orm";

import { getDb, schema } from "@server/db";
import { router, authedProcedure } from "@server/trpc/router";

export const workspacesRouter = router({
  list: authedProcedure.query(async ({ ctx }) => {
    const db = await getDb();

    if (!db) {
      return ctx.user?.workspaceId
        ? [{ id: ctx.user.workspaceId, name: `Workspace ${ctx.user.workspaceId}`, externalId: String(ctx.user.workspaceId) }]
        : [];
    }

    const baseQuery = db
      .select({ id: schema.workspaces.id, name: schema.workspaces.name, externalId: schema.workspaces.externalId })
      .from(schema.workspaces);

    const rows = ctx.user.workspaceId
      ? await baseQuery.where(and(eq(schema.workspaces.id, ctx.user.workspaceId)))
      : await baseQuery;

    if (rows.length === 0 && ctx.user.workspaceId != null) {
      return [{ id: ctx.user.workspaceId, name: `Workspace ${ctx.user.workspaceId}`, externalId: String(ctx.user.workspaceId) }];
    }

    return rows;
  }),
});
