import { router, authedProcedure } from "@server/trpc/router";
import { loadStrategies } from "@server/engine/portfolio-engine";

export const strategiesRouter = router({
  list: authedProcedure.query(async ({ ctx }) => loadStrategies(ctx.userId)),
});
