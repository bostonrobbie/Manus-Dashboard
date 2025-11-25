import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  buildAggregatedEquityCurve,
  buildDrawdownCurves,
  buildStrategyComparison,
  generateTradesCsv,
  runMonteCarloSimulation,
} from "../portfolio-engine";
import {
  getPositionsByUserId,
  getTradeStatistics,
} from "../db";

export const portfolioRouter = router({
  /**
   * Portfolio Overview - Legacy endpoint for backward compatibility
   * TODO: Migrate frontend to use equityCurveWithBenchmark instead
   */
  overview: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.user.id;

    const [positions, tradeStats] = await Promise.all([
      getPositionsByUserId(userId),
      getTradeStatistics(userId),
    ]);

    // Get latest equity from canonical engine
    const equityData = await buildAggregatedEquityCurve(userId, {});
    const latestPoint = equityData.points.length > 0 
      ? equityData.points[equityData.points.length - 1] 
      : null;

    // Calculate profit factor from trade stats
    const avgWin = tradeStats?.avgWin ? parseFloat(tradeStats.avgWin) : 0;
    const avgLoss = tradeStats?.avgLoss ? parseFloat(tradeStats.avgLoss) : 0;
    const profitFactor = avgLoss !== 0 ? Math.abs(avgWin / avgLoss) : 0;

    return {
      equity: latestPoint?.combined || 0,
      dailyPnL: 0, // TODO: Calculate from equity curve
      dailyReturn: 0, // TODO: Calculate from equity curve
      totalReturn: 0, // TODO: Calculate from equity curve
      sharpeRatio: 0, // TODO: Get from metrics
      maxDrawdown: 0, // TODO: Get from drawdown calculation
      currentDrawdown: 0, // TODO: Get from drawdown calculation
      totalTrades: tradeStats?.totalTrades || 0,
      winningTrades: tradeStats?.winningTrades || 0,
      losingTrades: tradeStats?.losingTrades || 0,
      winRate: tradeStats && tradeStats.totalTrades > 0 
        ? (tradeStats.winningTrades / tradeStats.totalTrades) * 100 
        : 0,
      profitFactor,
      positions: positions.length,
      lastUpdated: new Date(),
    };
  }),

  /**
   * Multi-curve equity endpoint - Returns Combined/Swing/Intraday/S&P 500
   */
  equityCurveWithBenchmark: protectedProcedure
    .input(
      z
        .object({
          startDate: z.string().optional(),
          endDate: z.string().optional(),
          maxPoints: z.number().optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.user.id;
      const res = await buildAggregatedEquityCurve(userId, input ?? {});
      const dates = res.points.map((p) => p.date);
      return {
        dates,
        combined: res.points.map((p) => p.combined),
        swing: res.points.map((p) => p.swing),
        intraday: res.points.map((p) => p.intraday),
        spx: res.points.map((p) => p.spx),
      };
    }),

  /**
   * Drawdown curves - Returns underwater equity for all curves
   */
  drawdown: protectedProcedure
    .input(
      z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.user.id;
      const res = await buildDrawdownCurves(userId, input);
      const dates = res.points.map((p) => p.date);
      return {
        dates,
        combined: res.points.map((p) => p.combined),
        swing: res.points.map((p) => p.swing),
        intraday: res.points.map((p) => p.intraday),
        spx: res.points.map((p) => p.spx),
      };
    }),

  /**
   * Strategy comparison table with pagination and filtering
   */
  strategyComparison: protectedProcedure
    .input(
      z.object({
        page: z.number().default(1),
        pageSize: z.number().default(20),
        sortBy: z.string().default("totalReturn"),
        sortOrder: z.enum(["asc", "desc"]).default("desc"),
        filterType: z.enum(["all", "swing", "intraday"]).default("all"),
        search: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.user.id;
      const { rows, total } = await buildStrategyComparison({
        ...input,
        userId,
      });
      return { rows, total };
    }),

  /**
   * Export trades as CSV
   */
  exportTrades: protectedProcedure
    .input(
      z.object({
        strategyIds: z.array(z.number()).optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.user.id;
      const csv = await generateTradesCsv({
        userId,
        ...input,
      });
      return { csv };
    }),

  /**
   * Monte Carlo simulation for future equity projections
   */
  monteCarloSimulation: protectedProcedure
    .input(
      z.object({
        strategyIds: z.array(z.number()).optional(),
        days: z.number().default(252),
        simulations: z.number().default(1000),
      })
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.user.id;
      const res = await runMonteCarloSimulation({
        userId,
        days: input.days,
        simulations: input.simulations,
        strategyIds: input.strategyIds,
      });
      return res;
    }),

  /**
   * Legacy positions endpoint - kept for backward compatibility
   */
  positions: protectedProcedure
    .input(z.object({
      strategyId: z.number().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.user.id;
      const positions = await getPositionsByUserId(userId, input.strategyId);

      return positions.map(pos => ({
        id: pos.id,
        symbol: pos.symbol,
        side: pos.side,
        quantity: parseFloat(pos.quantity),
        entryPrice: parseFloat(pos.entryPrice),
        currentPrice: parseFloat(pos.currentPrice),
        unrealizedPnL: parseFloat(pos.unrealizedPnL),
        unrealizedPnLPercent: parseFloat(pos.unrealizedPnLPercent),
        entryTime: pos.entryTime,
      }));
    }),
});
