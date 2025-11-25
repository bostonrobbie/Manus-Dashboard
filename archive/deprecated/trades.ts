import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getTradesByUserId, getTradeStatistics } from "../db";

export const tradesRouter = router({
  list: protectedProcedure
    .input(z.object({
      strategyId: z.number().optional(),
      symbol: z.string().optional(),
      side: z.string().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      limit: z.number().optional().default(50),
      offset: z.number().optional().default(0),
    }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.user.id;
      const startDate = input.startDate ? new Date(input.startDate) : undefined;
      const endDate = input.endDate ? new Date(input.endDate) : undefined;

      const trades = await getTradesByUserId(userId, {
        strategyId: input.strategyId,
        symbol: input.symbol,
        side: input.side,
        startDate,
        endDate,
        limit: input.limit,
        offset: input.offset,
      });

      return trades.map(trade => ({
        id: trade.id,
        externalId: trade.externalId,
        symbol: trade.symbol,
        side: trade.side,
        entryPrice: parseFloat(trade.entryPrice),
        entryTime: trade.entryTime,
        quantity: parseFloat(trade.quantity),
        exitPrice: trade.exitPrice ? parseFloat(trade.exitPrice) : null,
        exitTime: trade.exitTime,
        pnl: trade.pnl ? parseFloat(trade.pnl) : null,
        pnlPercent: trade.pnlPercent ? parseFloat(trade.pnlPercent) : null,
        holdingPeriod: trade.holdingPeriod,
        strategyId: trade.strategyId,
      }));
    }),

  statistics: protectedProcedure
    .input(z.object({
      strategyId: z.number().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.user.id;
      const stats = await getTradeStatistics(userId, input.strategyId);

      if (!stats) {
        return {
          totalTrades: 0,
          winningTrades: 0,
          losingTrades: 0,
          winRate: 0,
          totalPnL: 0,
          avgWin: 0,
          avgLoss: 0,
          profitFactor: 0,
        };
      }

      const winRate = stats.totalTrades > 0 ? (stats.winningTrades / stats.totalTrades) * 100 : 0;
      const avgWin = stats.avgWin ? parseFloat(stats.avgWin) : 0;
      const avgLoss = stats.avgLoss ? parseFloat(stats.avgLoss) : 0;
      const profitFactor = avgLoss !== 0 ? Math.abs(avgWin / avgLoss) : 0;

      return {
        totalTrades: stats.totalTrades,
        winningTrades: stats.winningTrades,
        losingTrades: stats.losingTrades,
        winRate,
        totalPnL: stats.totalPnL ? parseFloat(stats.totalPnL) : 0,
        avgWin,
        avgLoss,
        profitFactor,
      };
    }),
});
