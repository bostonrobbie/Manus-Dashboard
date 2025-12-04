import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import * as analytics from "./analytics";

// Time range enum for filtering
const TimeRange = z.enum(['YTD', '1Y', '3Y', '5Y', 'ALL']);

export const appRouter = router({
  system: systemRouter,
  
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  portfolio: router({
    /**
     * Get portfolio overview with combined performance metrics
     */
    overview: protectedProcedure
      .input(z.object({
        timeRange: TimeRange.optional(),
        startingCapital: z.number().optional().default(100000),
      }))
      .query(async ({ input }) => {
        const { timeRange, startingCapital } = input;

        // Calculate date range
        const now = new Date();
        let startDate: Date | undefined;

        if (timeRange) {
          const year = now.getFullYear();
          switch (timeRange) {
            case 'YTD':
              startDate = new Date(year, 0, 1);
              break;
            case '1Y':
              startDate = new Date(now);
              startDate.setFullYear(year - 1);
              break;
            case '3Y':
              startDate = new Date(now);
              startDate.setFullYear(year - 3);
              break;
            case '5Y':
              startDate = new Date(now);
              startDate.setFullYear(year - 5);
              break;
            case 'ALL':
              startDate = undefined;
              break;
          }
        }

        // Get all strategies
        const strategies = await db.getAllStrategies();
        const strategyIds = strategies.map(s => s.id);

        // Get trades for all strategies
        const allTrades = await db.getTrades({
          strategyIds,
          startDate,
          endDate: now,
        });

        // Get benchmark data
        const benchmarkData = await db.getBenchmarkData({
          startDate,
          endDate: now,
        });

        // Calculate portfolio metrics
        const metrics = analytics.calculatePerformanceMetrics(
          allTrades,
          startingCapital
        );

        // Calculate equity curves
        const portfolioEquity = analytics.calculateEquityCurve(allTrades, startingCapital);
        const benchmarkEquity = analytics.calculateBenchmarkEquityCurve(
          benchmarkData,
          startingCapital
        );

        // Calculate performance by period
        const dailyPerf = analytics.calculatePerformanceByPeriod(allTrades, 'day');
        const weeklyPerf = analytics.calculatePerformanceByPeriod(allTrades, 'week');
        const monthlyPerf = analytics.calculatePerformanceByPeriod(allTrades, 'month');
        const quarterlyPerf = analytics.calculatePerformanceByPeriod(allTrades, 'quarter');
        const yearlyPerf = analytics.calculatePerformanceByPeriod(allTrades, 'year');

        return {
          metrics,
          portfolioEquity,
          benchmarkEquity,
          periodPerformance: {
            daily: dailyPerf,
            weekly: weeklyPerf,
            monthly: monthlyPerf,
            quarterly: quarterlyPerf,
            yearly: yearlyPerf,
          },
          strategies: strategies.map(s => ({
            id: s.id,
            name: s.name,
            symbol: s.symbol,
            market: s.market,
          })),
        };
      }),

    /**
     * Get detailed performance for a single strategy
     */
    strategyDetail: protectedProcedure
      .input(z.object({
        strategyId: z.number(),
        timeRange: TimeRange.optional(),
        startingCapital: z.number().optional().default(100000),
      }))
      .query(async ({ input }) => {
        const { strategyId, timeRange, startingCapital } = input;

        // Get strategy info
        const strategy = await db.getStrategyById(strategyId);
        if (!strategy) {
          throw new Error("Strategy not found");
        }

        // Calculate date range
        const now = new Date();
        let startDate: Date | undefined;

        if (timeRange) {
          const year = now.getFullYear();
          switch (timeRange) {
            case 'YTD':
              startDate = new Date(year, 0, 1);
              break;
            case '1Y':
              startDate = new Date(now);
              startDate.setFullYear(year - 1);
              break;
            case '3Y':
              startDate = new Date(now);
              startDate.setFullYear(year - 3);
              break;
            case '5Y':
              startDate = new Date(now);
              startDate.setFullYear(year - 5);
              break;
            case 'ALL':
              startDate = undefined;
              break;
          }
        }

        // Get trades for this strategy
        const strategyTrades = await db.getTrades({
          strategyIds: [strategyId],
          startDate,
          endDate: now,
        });

        // Calculate metrics
        const metrics = analytics.calculatePerformanceMetrics(
          strategyTrades,
          startingCapital
        );

        // Calculate equity curve
        const equityCurve = analytics.calculateEquityCurve(strategyTrades, startingCapital);

        // Get recent trades (last 50)
        const recentTrades = [...strategyTrades]
          .sort((a, b) => b.exitDate.getTime() - a.exitDate.getTime())
          .slice(0, 50);

        return {
          strategy,
          metrics,
          equityCurve,
          recentTrades,
        };
      }),

    /**
     * Compare multiple strategies
     */
    compareStrategies: protectedProcedure
      .input(z.object({
        strategyIds: z.array(z.number()).min(2).max(4),
        timeRange: TimeRange.optional(),
        startingCapital: z.number().optional().default(100000),
      }))
      .query(async ({ input }) => {
        const { strategyIds, timeRange, startingCapital } = input;

        // Calculate date range
        const now = new Date();
        let startDate: Date | undefined;

        if (timeRange) {
          const year = now.getFullYear();
          switch (timeRange) {
            case 'YTD':
              startDate = new Date(year, 0, 1);
              break;
            case '1Y':
              startDate = new Date(now);
              startDate.setFullYear(year - 1);
              break;
            case '3Y':
              startDate = new Date(now);
              startDate.setFullYear(year - 3);
              break;
            case '5Y':
              startDate = new Date(now);
              startDate.setFullYear(year - 5);
              break;
            case 'ALL':
              startDate = undefined;
              break;
          }
        }

        // Get strategy info
        const strategies = await Promise.all(
          strategyIds.map(id => db.getStrategyById(id))
        );

        // Get trades for each strategy
        const tradesPerStrategy = await Promise.all(
          strategyIds.map(id => db.getTrades({
            strategyIds: [id],
            startDate,
            endDate: now,
          }))
        );

        // Calculate metrics for each strategy
        const metricsPerStrategy = tradesPerStrategy.map(trades =>
          analytics.calculatePerformanceMetrics(trades, startingCapital)
        );

        // Calculate equity curves for each strategy
        const equityCurvesPerStrategy = tradesPerStrategy.map(trades =>
          analytics.calculateEquityCurve(trades, startingCapital)
        );

        // Find date range for forward-filling
        const allDates = equityCurvesPerStrategy
          .flat()
          .map(p => p.date)
          .sort((a, b) => a.getTime() - b.getTime());
        
        const minDate = allDates[0] || new Date();
        const maxDate = allDates[allDates.length - 1] || new Date();

        // Forward-fill all equity curves
        const forwardFilledCurves = equityCurvesPerStrategy.map(curve =>
          analytics.forwardFillEquityCurve(curve, minDate, maxDate)
        );

        // Calculate combined equity curve (equal-weighted)
        const combinedEquity: analytics.EquityPoint[] = [];
        if (forwardFilledCurves.length > 0 && forwardFilledCurves[0]!.length > 0) {
          for (let i = 0; i < forwardFilledCurves[0]!.length; i++) {
            const date = forwardFilledCurves[0]![i]!.date;
            const avgEquity = forwardFilledCurves.reduce(
              (sum, curve) => sum + (curve[i]?.equity || 0),
              0
            ) / forwardFilledCurves.length;

            combinedEquity.push({
              date,
              equity: avgEquity,
              drawdown: 0, // Calculate if needed
            });
          }
        }

        // Calculate correlation matrix
        const correlationMatrix: number[][] = [];
        for (let i = 0; i < forwardFilledCurves.length; i++) {
          correlationMatrix[i] = [];
          for (let j = 0; j < forwardFilledCurves.length; j++) {
            const corr = analytics.calculateCorrelation(
              forwardFilledCurves[i]!,
              forwardFilledCurves[j]!
            );
            correlationMatrix[i]![j] = corr;
          }
        }

        return {
          strategies: strategies.map((s, i) => ({
            id: s?.id,
            name: s?.name,
            symbol: s?.symbol,
            market: s?.market,
            metrics: metricsPerStrategy[i],
            equityCurve: forwardFilledCurves[i],
          })),
          combinedEquity,
          correlationMatrix,
        };
      }),

    /**
     * Get list of all strategies
     */
    listStrategies: protectedProcedure.query(async () => {
      const strategies = await db.getAllStrategies();
      return strategies;
    }),
  }),
});

export type AppRouter = typeof appRouter;
