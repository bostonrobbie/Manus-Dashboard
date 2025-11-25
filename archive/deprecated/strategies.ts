import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { createStrategy, getStrategiesByUserId, getStrategyById } from "../db";

export const strategiesRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.user.id;
    const strategies = await getStrategiesByUserId(userId);

    return strategies.map(strategy => ({
      id: strategy.id,
      name: strategy.name,
      description: strategy.description,
      type: strategy.type,
      isActive: strategy.isActive === 1,
      totalTrades: strategy.totalTrades,
      winRate: strategy.winRate ? parseFloat(strategy.winRate) : null,
      totalPnL: strategy.totalPnL ? parseFloat(strategy.totalPnL) : null,
      sharpeRatio: strategy.sharpeRatio ? parseFloat(strategy.sharpeRatio) : null,
      createdAt: strategy.createdAt,
    }));
  }),

  create: protectedProcedure
    .input(z.object({
      name: z.string(),
      symbol: z.string(),
      description: z.string().optional(),
      type: z.enum(["swing", "intraday", "discretionary"]),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;

      await createStrategy({
        userId,
        name: input.name,
        symbol: input.symbol,
        description: input.description,
        type: input.type,
      });

      return { success: true };
    }),

  get: protectedProcedure
    .input(z.object({
      id: z.number(),
    }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.user.id;
      const strategy = await getStrategyById(input.id, userId);

      if (!strategy) {
        throw new Error("Strategy not found");
      }

      return {
        id: strategy.id,
        name: strategy.name,
        description: strategy.description,
        type: strategy.type,
        isActive: strategy.isActive === 1,
        totalTrades: strategy.totalTrades,
        winRate: strategy.winRate ? parseFloat(strategy.winRate) : null,
        totalPnL: strategy.totalPnL ? parseFloat(strategy.totalPnL) : null,
        sharpeRatio: strategy.sharpeRatio ? parseFloat(strategy.sharpeRatio) : null,
        createdAt: strategy.createdAt,
      };
    }),
});
