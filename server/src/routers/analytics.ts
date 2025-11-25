import { router, authedProcedure } from "../trpc/router";
import { buildPortfolioSummary } from "../engine/portfolio-engine";

export const analyticsRouter = router({
  summary: authedProcedure.query(async ({ ctx }) => buildPortfolioSummary(ctx.userId)),
});
