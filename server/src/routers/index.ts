import { router } from "@server/trpc/router";
import { authRouter } from "./auth";
import { analyticsRouter } from "./analytics";
import { portfolioRouter } from "./portfolio";
import { strategiesRouter } from "./strategies";

export const appRouter = router({
  auth: authRouter,
  analytics: analyticsRouter,
  portfolio: portfolioRouter,
  strategies: strategiesRouter,
});

export type AppRouter = typeof appRouter;
