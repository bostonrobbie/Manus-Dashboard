import { router, authedProcedure } from "@server/trpc/router";
import { loadStrategies } from "@server/engine/portfolio-engine";
import { requireUser } from "@server/trpc/authHelpers";

export const strategiesRouter = router({
  list: authedProcedure.query(async ({ ctx }) => {
    const user = requireUser(ctx as any);
    return loadStrategies({ userId: user.id });
  }),
});
