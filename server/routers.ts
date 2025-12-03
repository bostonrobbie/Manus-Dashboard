import { router } from "./_core/trpc";
import { adminDataRouter } from "./routers/adminData";
import { analyticsRouter } from "./routers/analytics";
import { authRouter } from "./routers/auth";
import { portfolioRouter } from "./routers/portfolio";
import { strategiesRouter } from "./routers/strategies";
import { systemRouter } from "./routers/system";
import { uploadsRouter } from "./routers/uploads";
import { workspacesRouter } from "./routers/workspaces";

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
