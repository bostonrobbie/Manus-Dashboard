import { router } from "@server/trpc/router";
import { authRouter } from "./auth";
import { analyticsRouter } from "./analytics";
import { portfolioRouter } from "./portfolio";
import { strategiesRouter } from "./strategies";
import { workspacesRouter } from "./workspaces";
import { uploadsRouter } from "./uploads";

export const appRouter = router({
  auth: authRouter,
  analytics: analyticsRouter,
  portfolio: portfolioRouter,
  strategies: strategiesRouter,
  workspaces: workspacesRouter,
  uploads: uploadsRouter,
});

export type AppRouter = typeof appRouter;
