import { router, authedProcedure } from "@server/trpc/router";
import { buildPortfolioSummary } from "@server/engine/portfolio-engine";

export const analyticsRouter = router({
  summary: authedProcedure.query(async ({ ctx }) => buildPortfolioSummary(ctx.userId)),
});
