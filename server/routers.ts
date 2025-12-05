import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import * as analytics from "./analytics";
import * as breakdown from "./breakdown";

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

        // Get trades for all strategies (filtered by time range)
        const allTrades = await db.getTrades({
          strategyIds,
          startDate,
          endDate: now,
        });

        // Also get ALL trades (full history) for rolling metrics calculation
        const allTradesFullHistory = await db.getTrades({
          strategyIds,
          startDate: undefined, // No filter - get everything
          endDate: now,
        });

        // Get benchmark data
        const benchmarkData = await db.getBenchmarkData({
          startDate,
          endDate: now,
        });

        // Calculate average conversion ratio for portfolio (weighted by trade count)
        const strategyRatios = new Map<number, number>();
        for (const strategy of strategies) {
          strategyRatios.set(strategy.id, strategy.microToMiniRatio);
        }
        
        // Use weighted average ratio based on trades per strategy
        let totalRatio = 0;
        let totalTrades = 0;
        for (const strategy of strategies) {
          const stratTrades = allTrades.filter(t => t.strategyId === strategy.id);
          totalRatio += strategy.microToMiniRatio * stratTrades.length;
          totalTrades += stratTrades.length;
        }
        const avgRatio = totalTrades > 0 ? totalRatio / totalTrades : 10;

        // Calculate portfolio metrics (mini contracts)
        const metrics = analytics.calculatePerformanceMetrics(
          allTrades,
          startingCapital
        );

        // Calculate equity curves (mini contracts)
        const rawPortfolioEquity = analytics.calculateEquityCurve(
          allTrades,
          startingCapital
        );

        // Calculate full history equity curve for rolling metrics
        const rawPortfolioEquityFull = analytics.calculateEquityCurve(
          allTradesFullHistory,
          startingCapital
        );
        const rawBenchmarkEquity = analytics.calculateBenchmarkEquityCurve(
          benchmarkData,
          startingCapital
        );

        // Determine date range for forward fill
        const equityStartDate = startDate || (
          rawPortfolioEquity.length > 0 
            ? rawPortfolioEquity[0]!.date 
            : new Date()
        );
        const equityEndDate = now;

        // Benchmark should use its own start date (earliest available data in range)
        const benchmarkStartDate = rawBenchmarkEquity.length > 0
          ? rawBenchmarkEquity[0]!.date
          : equityStartDate;
        
        // Benchmark should end at its last available data point (not portfolio end)
        const benchmarkEndDate = rawBenchmarkEquity.length > 0
          ? rawBenchmarkEquity[rawBenchmarkEquity.length - 1]!.date
          : equityEndDate;

        // Forward-fill to create continuous daily series
        const portfolioEquity = analytics.forwardFillEquityCurve(
          rawPortfolioEquity,
          equityStartDate,
          equityEndDate
        );

        // Forward-fill full history for rolling metrics
        const fullHistoryStartDate = rawPortfolioEquityFull.length > 0
          ? rawPortfolioEquityFull[0]!.date
          : new Date();
        const portfolioEquityFull = analytics.forwardFillEquityCurve(
          rawPortfolioEquityFull,
          fullHistoryStartDate,
          equityEndDate
        );
        // Forward-fill benchmark only to its last available date
        const benchmarkEquity = analytics.forwardFillEquityCurve(
          rawBenchmarkEquity,
          benchmarkStartDate,
          benchmarkEndDate
        );

        // Calculate performance by period
        const dailyPerf = analytics.calculatePerformanceByPeriod(allTrades, 'day');
        const weeklyPerf = analytics.calculatePerformanceByPeriod(allTrades, 'week');
        const monthlyPerf = analytics.calculatePerformanceByPeriod(allTrades, 'month');
        const quarterlyPerf = analytics.calculatePerformanceByPeriod(allTrades, 'quarter');
        const yearlyPerf = analytics.calculatePerformanceByPeriod(allTrades, 'year');

        // Calculate underwater data for portfolio and benchmark
        const underwater = analytics.calculatePortfolioUnderwater(portfolioEquity);
        const dayOfWeekBreakdown = analytics.calculateDayOfWeekBreakdown(allTrades);

        // Calculate strategy correlation matrix
        const strategyEquityCurves = new Map<string, analytics.EquityPoint[]>();
        for (const strategy of strategies) {
          const strategyTrades = allTrades.filter(t => t.strategyId === strategy.id);
          if (strategyTrades.length > 0) {
            const rawEquity = analytics.calculateEquityCurve(strategyTrades, startingCapital);
            const strategyStartDate = rawEquity.length > 0 ? rawEquity[0]!.date : equityStartDate;
            const forwardFilled = analytics.forwardFillEquityCurve(
              rawEquity,
              strategyStartDate,
              equityEndDate
            );
            strategyEquityCurves.set(strategy.name, forwardFilled);
          }
        }
        
        // Add portfolio and benchmark to correlation matrix
        strategyEquityCurves.set('Portfolio', portfolioEquity);
        strategyEquityCurves.set('S&P 500', benchmarkEquity);
        
        const strategyCorrelationMatrix = analytics.calculateStrategyCorrelationMatrix(strategyEquityCurves);

        // Calculate rolling metrics (30, 90, 365 day windows)
        // Compute on full history, then filter to time range
        const rollingMetrics = analytics.calculateRollingMetrics(
          portfolioEquityFull,
          [30, 90, 365],
          startDate,
          now
        );

        // Calculate monthly returns calendar
        const monthlyReturnsCalendar = analytics.calculateMonthlyReturnsCalendar(portfolioEquity);

        // Generate portfolio summary narrative
        // For ALL time range, use the earliest trade date as start
        const effectiveStartDate = startDate || (allTrades.length > 0 ? allTrades[0]!.entryDate : now);
        const summary = analytics.generatePortfolioSummary(metrics, underwater, effectiveStartDate, now);

        // Calculate daily returns distribution
        const distribution = analytics.calculateDailyReturnsDistribution(portfolioEquity);

        // Major drawdowns (calculate on FULL history, not filtered by timeRange)
        const majorDrawdowns = analytics.calculateMajorDrawdowns(portfolioEquityFull, -10);

        return {
          metrics,
          tradeStats: metrics.tradeStats, // Expose tradeStats directly for easier frontend access
          summary, // Portfolio narrative summary
          portfolioEquity,
          benchmarkEquity,
          underwater,
          majorDrawdowns,
          distribution,
          dayOfWeekBreakdown,
          strategyCorrelationMatrix,
          rollingMetrics,
          monthlyReturnsCalendar,
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
        const rawEquityCurve = analytics.calculateEquityCurve(strategyTrades, startingCapital);
        
        // Determine date range for forward fill
        const equityStartDate = startDate || (
          rawEquityCurve.length > 0 
            ? rawEquityCurve[0]!.date 
            : new Date()
        );
        const equityEndDate = now;
        
        // Forward-fill to create continuous daily series
        const equityCurve = analytics.forwardFillEquityCurve(
          rawEquityCurve,
          equityStartDate,
          equityEndDate
        );

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
        strategyIds: z.array(z.number()).min(1).max(10),
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

        // Calculate combined metrics from combined trades
        const allCombinedTrades = tradesPerStrategy.flat();
        const combinedMetrics = analytics.calculatePerformanceMetrics(
          allCombinedTrades,
          startingCapital * forwardFilledCurves.length // Scale capital by number of strategies
        );

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
          combinedMetrics,
          correlationMatrix,
        };
      }),

    /**
     * Get performance breakdown by time periods
     */
    performanceBreakdown: protectedProcedure
      .input(z.object({
        strategyId: z.number().optional(),
        timeRange: TimeRange.optional(),
        startingCapital: z.number().optional().default(100000),
      }))
      .query(async ({ input }) => {
        const { strategyId, timeRange, startingCapital } = input;

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

        // Get trades
        const trades = await db.getTrades({
          strategyIds: strategyId ? [strategyId] : undefined,
          startDate,
          endDate: now,
        });

        // Calculate breakdown (mini contracts)
        const performanceBreakdown = breakdown.calculatePerformanceBreakdown(
          trades,
          startingCapital
        );

        return performanceBreakdown;
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
