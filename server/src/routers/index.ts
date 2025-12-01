import { router } from "@server/trpc/router";
import { authRouter } from "./auth";
import { analyticsRouter } from "./analytics";
import { portfolioRouter } from "./portfolio";
import { strategiesRouter } from "./strategies";
import { workspacesRouter } from "./workspaces";
import { uploadsRouter } from "./uploads";
import { adminDataRouter } from "./adminData";
import { systemRouter } from "./system";

export const appRouter = router({
  auth: authRouter,
  analytics: analyticsRouter,
  portfolio: portfolioRouter,
  strategies: strategiesRouter,
  workspaces: workspacesRouter,
  uploads: uploadsRouter,
  adminData: adminDataRouter,
  system: systemRouter,
});

export type AppRouter = typeof appRouter;
