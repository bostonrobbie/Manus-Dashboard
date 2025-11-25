import { router, authedProcedure } from "../trpc/router";
import { loadStrategies } from "../engine/portfolio-engine";

export const strategiesRouter = router({
  list: authedProcedure.query(async ({ ctx }) => loadStrategies(ctx.userId)),
});
