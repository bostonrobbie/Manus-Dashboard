import { protectedProcedure, requireUser, router } from "../_core/trpc";
import { loadStrategies } from "../portfolio-engine";

export const strategiesRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const user = requireUser(ctx as any);
    return loadStrategies({ userId: user.id });
  }),
});
