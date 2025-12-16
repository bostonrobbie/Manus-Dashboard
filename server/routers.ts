import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import * as analytics from "./analytics";
import * as breakdown from "./breakdown";

// Time range enum for filtering  
type TimeRangeType = '6M' | 'YTD' | '1Y' | '3Y' | '5Y' | '10Y' | 'ALL';
const TimeRange = z.enum(['6M', 'YTD', '1Y', '3Y', '5Y', '10Y', 'ALL']);

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
            case '6M':
              startDate = new Date(now);
              startDate.setMonth(now.getMonth() - 6);
              break;
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
            case '10Y':
              startDate = new Date(now);
              startDate.setFullYear(year - 10);
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

        // Calculate full history equity curve first to get all-time peak
        const rawPortfolioEquityFull = analytics.calculateEquityCurve(
          allTradesFullHistory,
          startingCapital
        );
        
        // Find all-time peak from full history
        const allTimePeak = rawPortfolioEquityFull.length > 0
          ? Math.max(...rawPortfolioEquityFull.map(p => p.equity))
          : startingCapital;

        // Calculate equity curves for selected time range (mini contracts)
        const rawPortfolioEquityTemp = analytics.calculateEquityCurve(
          allTrades,
          startingCapital
        );
        
        // Recalculate drawdowns using all-time peak (not just peak within time range)
        const rawPortfolioEquity = analytics.recalculateDrawdownsWithPeak(
          rawPortfolioEquityTemp,
          allTimePeak
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
        const benchmarkUnderwater = analytics.calculatePortfolioUnderwater(benchmarkEquity);
        const dayOfWeekBreakdown = analytics.calculateDayOfWeekBreakdown(allTrades);
        const weekOfMonthBreakdown = analytics.calculateWeekOfMonthBreakdown(allTrades);

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
        // Use -5% threshold to ensure we capture top 3 drawdowns for visualization
        const majorDrawdowns = analytics.calculateMajorDrawdowns(portfolioEquityFull, -5);

        return {
          metrics,
          tradeStats: metrics.tradeStats, // Expose tradeStats directly for easier frontend access
          summary, // Portfolio narrative summary
          portfolioEquity,
          benchmarkEquity,
          underwater,
          benchmarkUnderwater,
          majorDrawdowns,
          distribution,
          dayOfWeekBreakdown,
          weekOfMonthBreakdown,
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
        contractSize: z.enum(['mini', 'micro']).optional().default('mini'),
      }))
      .query(async ({ input }) => {
        const { strategyId, timeRange, startingCapital, contractSize } = input;

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
            case '6M':
              startDate = new Date(now);
              startDate.setMonth(now.getMonth() - 6);
              break;
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
            case '10Y':
              startDate = new Date(now);
              startDate.setFullYear(year - 10);
              break;
            case 'ALL':
              startDate = undefined;
              break;
          }
        }

        // Get trades for this strategy
        const rawTrades = await db.getTrades({
          strategyIds: [strategyId],
          startDate,
          endDate: now,
        });
        
        // Apply contract size multiplier (micro contracts are 1/10th of mini)
        const contractMultiplier = contractSize === 'micro' ? 0.1 : 1;
        const strategyTrades = rawTrades.map(trade => ({
          ...trade,
          pnl: trade.pnl * contractMultiplier,
        }));

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
        
        // If we have a time filter, prepend starting capital point at startDate
        const equityCurveWithStart = startDate && rawEquityCurve.length > 0
          ? [
              { date: startDate, equity: startingCapital, drawdown: 0 },
              ...rawEquityCurve // Keep all trade points
            ]
          : rawEquityCurve;
        
        // Forward-fill to create continuous daily series
        const equityCurve = analytics.forwardFillEquityCurve(
          equityCurveWithStart,
          equityStartDate,
          equityEndDate
        );

        // Get recent trades (last 50)
        const recentTrades = [...strategyTrades]
          .sort((a, b) => b.exitDate.getTime() - a.exitDate.getTime())
          .slice(0, 50);

        // Get benchmark data (S&P 500)
        const benchmarkData = await db.getBenchmarkData({
          startDate: equityStartDate,
          endDate: equityEndDate,
        });
        
        // Calculate underwater curve
        const underwaterCurve = analytics.calculateUnderwaterCurve(equityCurve);
        
        // Convert benchmark to equity curve format for underwater calculation
        const benchmarkEquityCurve = benchmarkData.map((b, idx) => ({
          date: b.date,
          equity: b.close,
          drawdown: 0, // Will be calculated by underwater curve
        }));
        const benchmarkUnderwater = analytics.calculateUnderwaterCurve(benchmarkEquityCurve);

        return {
          strategy,
          metrics,
          equityCurve,
          benchmarkData,
          underwaterCurve,
          benchmarkUnderwater,
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
            case '6M':
              startDate = new Date(now);
              startDate.setMonth(now.getMonth() - 6);
              break;
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
            case '10Y':
              startDate = new Date(now);
              startDate.setFullYear(year - 10);
              break;
            case 'ALL':
              startDate = undefined;
              break;
          }
        }

        // Get strategy info
        const strategiesWithNulls = await Promise.all(
          strategyIds.map(id => db.getStrategyById(id))
        );
        
        // Filter out null strategies and track which IDs are invalid
        const strategies = strategiesWithNulls.filter((s): s is NonNullable<typeof s> => s !== null);
        const validStrategyIds = strategies.map(s => s.id);
        
        // If no valid strategies found, return early
        if (strategies.length === 0) {
          throw new Error("No valid strategies found");
        }

        // Get trades for each strategy (only valid ones)
        const tradesPerStrategy = await Promise.all(
          validStrategyIds.map(id => db.getTrades({
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
        
        // Handle case where there are no trades
        if (allDates.length === 0) {
          return {
            strategies: strategies.map((s) => ({
              id: s.id,
              name: s.name,
              symbol: s.symbol,
              market: s.market,
              metrics: {
                totalReturn: 0,
                annualizedReturn: 0,
                sharpeRatio: 0,
                sortino: 0,
                maxDrawdown: 0,
                winRate: 0,
                profitFactor: 0,
                expectancy: 0,
                totalTrades: 0,
                winningTrades: 0,
                losingTrades: 0,
              },
              equityCurve: [],
            })),
            combinedEquity: [],
            combinedMetrics: {
              totalReturn: 0,
              annualizedReturn: 0,
              sharpeRatio: 0,
              sortino: 0,
              maxDrawdown: 0,
              winRate: 0,
              profitFactor: 0,
              expectancy: 0,
              totalTrades: 0,
              winningTrades: 0,
              losingTrades: 0,
            },
            correlationMatrix: [],
          };
        }
        
        const globalMinDate = allDates[0]!;
        const globalMaxDate = allDates[allDates.length - 1]!;

        // Forward-fill each strategy's equity curve from its first trade to its last trade
        // This creates smooth daily curves like the individual strategy pages
        const forwardFilledCurves = equityCurvesPerStrategy.map((curve, i) => {
          if (curve.length === 0) return [];
          
          // Get this strategy's date range (first trade to last trade)
          const strategyMinDate = curve[0]!.date;
          const strategyMaxDate = curve[curve.length - 1]!.date;
          
          // Forward-fill within this strategy's own date range
          return analytics.forwardFillEquityCurve(
            curve,
            strategyMinDate,
            strategyMaxDate
          );
        });

        // Calculate combined equity curve by simulating actual combined trading
        // This merges all trades and calculates equity as if trading all strategies from one account
        const allCombinedTrades = tradesPerStrategy.flat();
        const rawCombinedEquity = analytics.calculateEquityCurve(
          allCombinedTrades,
          startingCapital // Use same starting capital, not scaled
        );
        const combinedEquity = analytics.forwardFillEquityCurve(
          rawCombinedEquity,
          globalMinDate,
          globalMaxDate
        );

        // Calculate combined metrics from combined trades
        const combinedMetrics = analytics.calculatePerformanceMetrics(
          allCombinedTrades,
          startingCapital // Use same starting capital
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
            id: s.id,
            name: s.name,
            symbol: s.symbol,
            market: s.market,
            metrics: metricsPerStrategy[i],
            equityCurve: forwardFilledCurves[i],
          })),
          combinedEquity,
          combinedMetrics,
          combinedTrades: allCombinedTrades,
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
            case '6M':
              startDate = new Date(now);
              startDate.setMonth(now.getMonth() - 6);
              break;
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
            case '10Y':
              startDate = new Date(now);
              startDate.setFullYear(year - 10);
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
     * Get visual analytics data for charts
     */
    visualAnalytics: protectedProcedure
      .input(z.object({
        timeRange: TimeRange.optional(),
      }))
      .query(async ({ input }) => {
        const { timeRange } = input;
        const visualAnalytics = await import('./analytics.visual.js');

        // Calculate date range
        const now = new Date();
        let startDate: Date | undefined;

        if (timeRange) {
          const year = now.getFullYear();
          switch (timeRange) {
            case '6M':
              startDate = new Date(now);
              startDate.setMonth(now.getMonth() - 6);
              break;
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
            case '10Y':
              startDate = new Date(now);
              startDate.setFullYear(year - 10);
              break;
            case 'ALL':
              startDate = undefined;
              break;
          }
        }

        // Get all trades
        const trades = await db.getTrades({
          startDate,
          endDate: now,
        });

        // Calculate visual analytics
        const streakDistribution = visualAnalytics.calculateStreakDistribution(trades);
        const durationDistribution = visualAnalytics.calculateDurationDistribution(trades);
        const dayOfWeekPerformance = visualAnalytics.calculateDayOfWeekPerformance(trades);

        return {
          streakDistribution,
          durationDistribution,
          dayOfWeekPerformance,
        };
      }),

    /**
     * Get list of all strategies with performance metrics
     */
    listStrategies: protectedProcedure.query(async () => {
      const strategies = await db.getAllStrategies();
      
      // Fetch performance metrics for each strategy
      const strategiesWithMetrics = await Promise.all(
        strategies.map(async (strategy) => {
          const trades = await db.getTrades({ strategyIds: [strategy.id] });
          
          if (trades.length === 0) {
            return {
              ...strategy,
              totalReturn: 0,
              maxDrawdown: 0,
              sharpeRatio: 0,
              firstTradeDate: null,
              lastTradeDate: null,
            };
          }
          
          const metrics = analytics.calculatePerformanceMetrics(trades, 100000);
          
          // Convert percentage return to dollar amount for display
          const totalReturnDollars = (metrics.totalReturn / 100) * 100000;
          
          // Get first and last trade dates for proper chart alignment
          const sortedTrades = [...trades].sort((a, b) => 
            new Date(a.entryDate).getTime() - new Date(b.entryDate).getTime()
          );
          const firstTradeDate = sortedTrades[0]?.entryDate ?? null;
          const lastTradeDate = sortedTrades[sortedTrades.length - 1]?.exitDate ?? null;
          
          return {
            ...strategy,
            totalReturn: totalReturnDollars,
            maxDrawdown: metrics.maxDrawdownDollars,
            sharpeRatio: metrics.sharpeRatio,
            firstTradeDate,
            lastTradeDate,
          };
        })
      );
      
      return strategiesWithMetrics;
    }),
  }),

  // Webhook router for TradingView integration
  webhook: router({
    /**
     * Get webhook configuration (URL and templates)
     */
    getConfig: protectedProcedure.query(({ ctx }) => {
      // Get the base URL from the request
      const protocol = ctx.req.headers['x-forwarded-proto'] || 'https';
      const host = ctx.req.headers['x-forwarded-host'] || ctx.req.headers.host || 'localhost:3000';
      const baseUrl = `${protocol}://${host}`;
      
      return {
        webhookUrl: `${baseUrl}/api/webhook/tradingview`,
      };
    }),

    /**
     * Get recent webhook logs
     */
    getLogs: protectedProcedure
      .input(z.object({
        limit: z.number().optional().default(50),
      }))
      .query(async ({ input }) => {
        const logs = await db.getWebhookLogs(input.limit);
        return logs;
      }),
  }),
});

export type AppRouter = typeof appRouter;
