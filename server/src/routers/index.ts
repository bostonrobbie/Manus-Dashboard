import { router } from "@server/trpc/router";
import { analyticsRouter } from "./analytics";
import { portfolioRouter } from "./portfolio";
import { strategiesRouter } from "./strategies";

export const appRouter = router({
  analytics: analyticsRouter,
  portfolio: portfolioRouter,
  strategies: strategiesRouter,
});

export type AppRouter = typeof appRouter;
