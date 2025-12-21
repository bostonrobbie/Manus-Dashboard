import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, adminProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import * as analytics from "./analytics";
import * as breakdown from "./breakdown";
import * as brokerService from "./brokerService";
import * as subscriptionService from "./subscriptionService";
import * as dataValidation from "./core/dataValidation";
import { stripeRouter } from "./stripe/stripeRouter";

// Time range enum for filtering  
type TimeRangeType = '6M' | 'YTD' | '1Y' | '3Y' | '5Y' | '10Y' | 'ALL';
const TimeRange = z.enum(['6M', 'YTD', '1Y', '3Y', '5Y', '10Y', 'ALL']);

export const appRouter = router({
  system: systemRouter,
  stripe: stripeRouter,
  
  // Public platform statistics for landing page
  platform: router({
    stats: publicProcedure.query(async () => {
      // Get all strategies
      const strategies = await db.getAllStrategies();
      const strategyIds = strategies.map(s => s.id);
      
      // Get all trades for calculating aggregate stats
      const allTrades = await db.getTrades({
        strategyIds,
        startDate: undefined,
        endDate: new Date(),
      });
      
      // Calculate portfolio metrics
      const startingCapital = 100000;
      const metrics = analytics.calculatePerformanceMetrics(allTrades, startingCapital);
      
      // Calculate equity curve for total return
      const portfolioEquity = analytics.calculateEquityCurve(allTrades, startingCapital);
      const finalEquity = portfolioEquity.length > 0 
        ? portfolioEquity[portfolioEquity.length - 1]!.equity 
        : startingCapital;
      const totalReturn = ((finalEquity - startingCapital) / startingCapital) * 100;
      
      // Get years of data
      const firstTradeDate = allTrades.length > 0 ? allTrades[0]!.entryDate : new Date();
      const yearsOfData = Math.max(1, (Date.now() - firstTradeDate.getTime()) / (365 * 24 * 60 * 60 * 1000));
      
      return {
        totalReturn: Math.round(totalReturn * 100) / 100,
        annualizedReturn: Math.round(metrics.annualizedReturn * 100) / 100,
        sharpeRatio: Math.round(metrics.sharpeRatio * 100) / 100,
        sortinoRatio: Math.round(metrics.sortinoRatio * 100) / 100,
        maxDrawdown: Math.round(metrics.maxDrawdown * 100) / 100,
        winRate: Math.round(metrics.winRate * 100) / 100,
        profitFactor: Math.round(metrics.profitFactor * 100) / 100,
        totalTrades: metrics.totalTrades,
        strategyCount: strategies.length,
        yearsOfData: Math.round(yearsOfData * 10) / 10,
        avgWin: Math.round(metrics.avgWin * 100) / 100,
        avgLoss: Math.round(metrics.avgLoss * 100) / 100,
      };
    }),
  }),
  
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
    completeOnboarding: protectedProcedure.mutation(async ({ ctx }) => {
      await db.updateUserOnboarding(ctx.user.id, true);
      return { success: true };
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

        // Generate data quality report
        const dataQuality = dataValidation.generateDataQualityReport(strategyTrades, startingCapital);

        return {
          strategy,
          metrics,
          equityCurve,
          benchmarkData,
          underwaterCurve,
          benchmarkUnderwater,
          recentTrades,
          dataQuality,
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

  // Webhook router for TradingView integration (Admin-only)
  webhook: router({
    /**
     * Check if current user has admin access to webhooks
     */
    checkAccess: protectedProcedure.query(({ ctx }) => {
      return {
        hasAccess: ctx.user.role === 'admin',
        role: ctx.user.role,
      };
    }),

    /**
     * Get webhook configuration (URL and templates)
     */
    getConfig: adminProcedure.query(({ ctx }) => {
      // Get the base URL from the request
      const protocol = ctx.req.headers['x-forwarded-proto'] || 'https';
      const host = ctx.req.headers['x-forwarded-host'] || ctx.req.headers.host || 'localhost:3000';
      const baseUrl = `${protocol}://${host}`;
      
      // Get the webhook token (masked for display, full for template generation)
      const webhookToken = process.env.TRADINGVIEW_WEBHOOK_TOKEN || '';
      const hasToken = webhookToken.length > 0;
      
      return {
        webhookUrl: `${baseUrl}/api/webhook/tradingview`,
        webhookToken: webhookToken, // Full token for template generation
        hasToken,
        tokenLength: webhookToken.length,
      };
    }),

    /**
     * Get recent webhook logs
     */
    getLogs: adminProcedure
      .input(z.object({
        limit: z.number().optional().default(50),
        status: z.enum(['all', 'success', 'failed', 'duplicate']).optional().default('all'),
        strategyId: z.number().optional(),
        search: z.string().optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      }))
      .query(async ({ input }) => {
        let logs = await db.getWebhookLogs(input.limit * 2); // Get extra for filtering
        
        // Apply filters
        if (input.status !== 'all') {
          logs = logs.filter(l => l.status === input.status);
        }
        if (input.strategyId) {
          logs = logs.filter(l => l.strategyId === input.strategyId);
        }
        if (input.search) {
          const searchLower = input.search.toLowerCase();
          logs = logs.filter(l => 
            l.payload?.toLowerCase().includes(searchLower) ||
            l.errorMessage?.toLowerCase().includes(searchLower) ||
            l.strategySymbol?.toLowerCase().includes(searchLower)
          );
        }
        if (input.startDate) {
          logs = logs.filter(l => new Date(l.createdAt) >= input.startDate!);
        }
        if (input.endDate) {
          logs = logs.filter(l => new Date(l.createdAt) <= input.endDate!);
        }
        
        return logs.slice(0, input.limit);
      }),

    /**
     * Get webhook processing status and statistics
     */
    getStatus: adminProcedure.query(async () => {
      const settings = await db.getWebhookSettings();
      const logs = await db.getWebhookLogs(100);
      
      // Calculate statistics
      const stats = {
        total: logs.length,
        success: logs.filter(l => l.status === 'success').length,
        failed: logs.filter(l => l.status === 'failed').length,
        duplicate: logs.filter(l => l.status === 'duplicate').length,
        pending: logs.filter(l => l.status === 'pending' || l.status === 'processing').length,
      };
      
      // Calculate average processing time
      const processingTimes = logs
        .filter(l => l.processingTimeMs !== null)
        .map(l => l.processingTimeMs!);
      const avgProcessingTime = processingTimes.length > 0
        ? Math.round(processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length)
        : 0;
      
      return {
        isPaused: settings.paused,
        stats,
        avgProcessingTimeMs: avgProcessingTime,
        lastWebhook: logs.length > 0 ? logs[0].createdAt : null,
      };
    }),

    /**
     * Pause webhook processing
     */
    pause: adminProcedure.mutation(async () => {
      await db.updateWebhookSettings({ paused: true });
      return { success: true, message: 'Webhook processing paused' };
    }),

    /**
     * Resume webhook processing
     */
    resume: adminProcedure.mutation(async () => {
      await db.updateWebhookSettings({ paused: false });
      return { success: true, message: 'Webhook processing resumed' };
    }),

    /**
     * Delete a specific webhook log
     */
    deleteLog: adminProcedure
      .input(z.object({ logId: z.number() }))
      .mutation(async ({ input }) => {
        const success = await db.deleteWebhookLog(input.logId);
        return { success };
      }),

    /**
     * Clear all webhook logs
     */
    clearLogs: adminProcedure.mutation(async () => {
      const deleted = await db.deleteAllWebhookLogs();
      return { success: true, deleted };
    }),

    /**
     * Delete a trade (for removing test trades)
     */
    deleteTrade: adminProcedure
      .input(z.object({ tradeId: z.number() }))
      .mutation(async ({ input }) => {
        const success = await db.deleteTrade(input.tradeId);
        return { success };
      }),

    /**
     * Send a test webhook (for testing the integration)
     */
    sendTestWebhook: adminProcedure
      .input(z.object({
        type: z.enum(['entry', 'exit']),
        strategy: z.string(),
        direction: z.enum(['Long', 'Short']),
        price: z.number(),
        quantity: z.number().optional().default(1),
        entryPrice: z.number().optional(),
        pnl: z.number().optional(),
        includeToken: z.boolean().optional().default(true),
      }))
      .mutation(async ({ input, ctx }) => {
        const { validatePayload, mapSymbolToStrategy } = await import('./webhookService');
        
        // Build the test payload
        const payload: Record<string, unknown> = {
          symbol: input.strategy,
          date: new Date().toISOString(),
          data: input.type === 'entry' ? (input.direction === 'Long' ? 'buy' : 'sell') : 'exit',
          quantity: input.quantity,
          price: input.price,
          direction: input.direction,
        };
        
        // Add token if requested
        if (input.includeToken && process.env.TRADINGVIEW_WEBHOOK_TOKEN) {
          payload.token = process.env.TRADINGVIEW_WEBHOOK_TOKEN;
        }
        
        // Add entry data for exit signals
        if (input.type === 'exit') {
          payload.entryPrice = input.entryPrice || input.price - (input.direction === 'Long' ? 10 : -10);
          payload.entryTime = new Date(Date.now() - 3600000).toISOString(); // 1 hour ago
          if (input.pnl !== undefined) {
            payload.pnl = input.pnl;
          }
        }
        
        // VALIDATE ONLY - do not persist to database
        // This allows testing without polluting the webhook logs
        try {
          const validated = validatePayload(payload);
          
          // Check if strategy exists
          const strategy = await db.getStrategyBySymbol(validated.strategySymbol);
          
          // Check token
          const expectedToken = process.env.TRADINGVIEW_WEBHOOK_TOKEN;
          const tokenValid = !expectedToken || payload.token === expectedToken;
          
          if (!strategy) {
            return {
              success: false,
              logId: 0,
              message: 'Test validation failed',
              error: `Unknown strategy: ${validated.strategySymbol}`,
              payload,
              isTest: true,
            };
          }
          
          if (!tokenValid) {
            return {
              success: false,
              logId: 0,
              message: 'Test validation failed',
              error: 'Invalid or missing authentication token',
              payload,
              isTest: true,
            };
          }
          
          return {
            success: true,
            logId: 0,
            message: `Test webhook validated successfully for ${strategy.name}`,
            payload,
            isTest: true,
            strategyName: strategy.name,
            validated,
          };
        } catch (error) {
          return {
            success: false,
            logId: 0,
            message: 'Test validation failed',
            error: error instanceof Error ? error.message : 'Unknown error',
            payload,
            isTest: true,
          };
        }
      }),

    /**
     * Validate a webhook payload without processing (dry run)
     */
    validatePayload: adminProcedure
      .input(z.object({
        payload: z.string(),
      }))
      .mutation(async ({ input }) => {
        const { validatePayload, mapSymbolToStrategy } = await import('./webhookService');
        
        try {
          const parsed = JSON.parse(input.payload);
          const validated = validatePayload(parsed);
          
          // Check if strategy exists
          const strategy = await db.getStrategyBySymbol(validated.strategySymbol);
          
          return {
            valid: true,
            parsed: validated,
            strategyFound: !!strategy,
            strategyName: strategy?.name || null,
            mappedSymbol: mapSymbolToStrategy(parsed.symbol || parsed.strategy || ''),
          };
        } catch (error) {
          return {
            valid: false,
            error: error instanceof Error ? error.message : 'Invalid payload',
          };
        }
      }),

    /**
     * Get comprehensive webhook health and monitoring data
     */
    getHealthReport: adminProcedure.query(async () => {
      const { isCircuitOpen, getCircuitStatus } = await import('./webhookSecurity');
      
      const logs = await db.getWebhookLogs(500);
      const now = Date.now();
      
      // Calculate metrics for different time windows
      const calculateMetrics = (windowMs: number) => {
        const windowLogs = logs.filter(l => {
          const logTime = new Date(l.createdAt).getTime();
          return now - logTime < windowMs;
        });
        
        const total = windowLogs.length;
        const success = windowLogs.filter(l => l.status === 'success').length;
        const failed = windowLogs.filter(l => l.status === 'failed').length;
        const duplicate = windowLogs.filter(l => l.status === 'duplicate').length;
        
        const processingTimes = windowLogs
          .filter(l => l.processingTimeMs !== null)
          .map(l => l.processingTimeMs!);
        
        return {
          total,
          success,
          failed,
          duplicate,
          successRate: total > 0 ? ((success / total) * 100).toFixed(1) + '%' : '100%',
          avgProcessingMs: processingTimes.length > 0
            ? Math.round(processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length)
            : 0,
          maxProcessingMs: processingTimes.length > 0 ? Math.max(...processingTimes) : 0,
          p95ProcessingMs: processingTimes.length > 0
            ? processingTimes.sort((a, b) => a - b)[Math.floor(processingTimes.length * 0.95)]
            : 0,
        };
      };
      
      // Check for issues
      const issues: string[] = [];
      const last24h = calculateMetrics(24 * 60 * 60 * 1000);
      const lastHour = calculateMetrics(60 * 60 * 1000);
      
      const settings = await db.getWebhookSettings();
      if (settings?.paused) {
        issues.push('Webhook processing is paused');
      }
      
      if (isCircuitOpen('webhook-database')) {
        issues.push('Database circuit breaker is open');
      }
      
      const successRateNum = parseFloat(lastHour.successRate);
      if (lastHour.total > 5 && successRateNum < 50) {
        issues.push(`Low success rate in last hour: ${lastHour.successRate}`);
      }
      
      if (lastHour.avgProcessingMs > 500) {
        issues.push(`High latency in last hour: ${lastHour.avgProcessingMs}ms avg`);
      }
      
      return {
        status: issues.length === 0 ? 'healthy' : 'degraded',
        isPaused: settings?.paused ?? false,
        circuitBreaker: {
          open: isCircuitOpen('webhook-database'),
          status: getCircuitStatus('webhook-database'),
        },
        metrics: {
          lastHour,
          last24Hours: last24h,
        },
        issues,
        lastWebhook: logs.length > 0 ? logs[0].createdAt : null,
      };
    }),

    /**
     * Trigger owner notification for webhook issues
     */
    notifyOwnerOfIssues: adminProcedure
      .input(z.object({
        issues: z.array(z.string()),
        metrics: z.object({
          total: z.number(),
          failed: z.number(),
          successRate: z.string(),
        }),
      }))
      .mutation(async ({ input }) => {
        const { notifyOwner } = await import('./_core/notification');
        
        const content = `
**Webhook Health Alert**

Issues detected:
${input.issues.map(i => `- ${i}`).join('\n')}

**Metrics (Last Hour):**
- Total webhooks: ${input.metrics.total}
- Failed: ${input.metrics.failed}
- Success rate: ${input.metrics.successRate}

Please check the Webhooks page in your dashboard for more details.
        `.trim();
        
        const success = await notifyOwner({
          title: 'TradingView Webhook Alert',
          content,
        });
        
        return { success };
      }),

    /**
     * Get all open positions (trades waiting for exit signals)
     */
    getOpenPositions: adminProcedure.query(async () => {
      const positions = await db.getAllOpenPositions();
      return positions.map(p => ({
        id: p.id,
        strategyId: p.strategyId,
        strategySymbol: p.strategySymbol,
        direction: p.direction,
        entryPrice: p.entryPrice / 100, // Convert from cents to dollars
        quantity: p.quantity,
        entryTime: p.entryTime,
        status: p.status,
        createdAt: p.createdAt,
      }));
    }),

    /**
     * Get recent positions (open + closed) for activity feed
     */
    getRecentPositions: adminProcedure
      .input(z.object({ limit: z.number().optional().default(50) }))
      .query(async ({ input }) => {
        const positions = await db.getRecentPositions(input.limit);
        return positions.map(p => ({
          id: p.id,
          strategyId: p.strategyId,
          strategySymbol: p.strategySymbol,
          direction: p.direction,
          entryPrice: p.entryPrice / 100,
          exitPrice: p.exitPrice ? p.exitPrice / 100 : null,
          quantity: p.quantity,
          entryTime: p.entryTime,
          exitTime: p.exitTime,
          status: p.status,
          pnl: p.pnl ? p.pnl / 100 : null,
          tradeId: p.tradeId,
          createdAt: p.createdAt,
        }));
      }),

    /**
     * Get position statistics for dashboard
     */
    getPositionStats: adminProcedure.query(async () => {
      const stats = await db.getPositionStats();
      return {
        openPositions: stats.open,
        closedToday: stats.closedToday,
        totalPnlToday: stats.totalPnlToday / 100, // Convert from cents to dollars
      };
    }),

    /**
     * Delete an open position (admin function)
     */
    deletePosition: adminProcedure
      .input(z.object({ positionId: z.number() }))
      .mutation(async ({ input }) => {
        const success = await db.deleteOpenPosition(input.positionId);
        return { success };
      }),

    /**
     * Clear all open positions for a strategy (admin function)
     */
    clearPositionsForStrategy: adminProcedure
      .input(z.object({ strategySymbol: z.string() }))
      .mutation(async ({ input }) => {
        const deleted = await db.clearOpenPositionsForStrategy(input.strategySymbol);
        return { success: true, deleted };
      }),
  }),

  // Broker router for trading integrations (Admin-only)
  broker: router({
    /**
     * Get Tradovate OAuth URL for redirect-based authentication
     */
    getTradovateOAuthUrl: adminProcedure
      .input(z.object({ isLive: z.boolean().optional().default(false) }))
      .query(async ({ ctx, input }) => {
        // Generate OAuth state for security
        const state = `${ctx.user.id}_${Date.now()}_${input.isLive ? 'live' : 'demo'}`;
        
        // Build OAuth URL - Tradovate OAuth endpoint
        const clientId = process.env.TRADOVATE_CLIENT_ID;
        if (!clientId) {
          return { url: null, error: 'Tradovate OAuth not configured' };
        }
        
        const baseUrl = process.env.VITE_APP_URL || 'https://intradaystrategies.com';
        const redirectUri = `${baseUrl}/api/oauth/tradovate/callback`;
        
        const params = new URLSearchParams({
          response_type: 'code',
          client_id: clientId,
          redirect_uri: redirectUri,
          state: state,
        });
        
        return { 
          url: `https://trader.tradovate.com/oauth?${params.toString()}`,
          state,
        };
      }),

    /**
     * Get all broker connections for the current user
     */
    getConnections: adminProcedure.query(async ({ ctx }) => {
      const connections = await brokerService.getBrokerConnections(ctx.user.id);
      // Don't expose sensitive tokens
      return connections.map(c => ({
        id: c.id,
        broker: c.broker,
        name: c.name,
        status: c.status,
        accountId: c.accountId,
        accountName: c.accountName,
        accountType: c.accountType,
        lastConnectedAt: c.lastConnectedAt,
        lastError: c.lastError,
        createdAt: c.createdAt,
      }));
    }),

    /**
     * Create a new broker connection
     */
    createConnection: adminProcedure
      .input(z.object({
        broker: z.enum(['tradovate', 'ibkr', 'fidelity']),
        name: z.string().min(1).max(100),
        accountId: z.string().optional(),
        accountType: z.enum(['live', 'paper', 'demo']).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await brokerService.createBrokerConnection({
          userId: ctx.user.id,
          broker: input.broker,
          name: input.name,
          accountId: input.accountId,
          accountType: input.accountType,
        });
        return { success: true };
      }),

    /**
     * Connect a broker with credentials
     */
    connect: adminProcedure
      .input(z.object({
        broker: z.enum(['tradovate', 'ibkr', 'fidelity']),
        credentials: z.object({
          username: z.string(),
          password: z.string().optional(),
          accountId: z.string().optional(),
        }),
        isDemo: z.boolean().optional().default(true),
      }))
      .mutation(async ({ ctx, input }) => {
        // Create the connection with credentials
        await brokerService.createBrokerConnection({
          userId: ctx.user.id,
          broker: input.broker,
          name: `${input.broker.charAt(0).toUpperCase() + input.broker.slice(1)} ${input.isDemo ? 'Demo' : 'Live'}`,
          accountId: input.credentials.accountId,
          accountType: input.isDemo ? 'demo' : 'live',
        });
        return { success: true };
      }),

    /**
     * Disconnect a broker
     */
    disconnect: adminProcedure
      .input(z.object({ connectionId: z.number() }))
      .mutation(async ({ input }) => {
        await brokerService.deleteBrokerConnection(input.connectionId);
        return { success: true };
      }),

    /**
     * Delete a broker connection
     */
    deleteConnection: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await brokerService.deleteBrokerConnection(input.id);
        return { success: true };
      }),

    /**
     * Get routing rules
     */
    getRoutingRules: adminProcedure.query(async ({ ctx }) => {
      return brokerService.getRoutingRules(ctx.user.id);
    }),

    /**
     * Get execution logs
     */
    getExecutionLogs: adminProcedure
      .input(z.object({
        webhookLogId: z.number().optional(),
        limit: z.number().optional().default(50),
      }))
      .query(async ({ input }) => {
        return brokerService.getExecutionLogs(input.webhookLogId, input.limit);
      }),

    /**
     * Get supported brokers with their status
     */
    getSupportedBrokers: adminProcedure.query(() => {
      return [
        {
          id: 'tradovate',
          name: 'Tradovate',
          description: 'Futures trading platform',
          status: 'available',
          features: ['futures', 'paper-trading'],
        },
        {
          id: 'ibkr',
          name: 'Interactive Brokers',
          description: 'Multi-asset broker',
          status: 'coming-soon',
          features: ['stocks', 'options', 'futures', 'forex'],
        },
        {
          id: 'fidelity',
          name: 'Fidelity',
          description: 'Stocks & options broker',
          status: 'coming-soon',
          features: ['stocks', 'options'],
        },
      ];
    }),
  }),

  // User subscription router for strategy subscriptions
  subscription: router({
    /**
     * Get all subscriptions for the current user
     */
    list: protectedProcedure.query(async ({ ctx }) => {
      return subscriptionService.getUserSubscriptions(ctx.user.id);
    }),

    /**
     * Subscribe to a strategy
     */
    subscribe: protectedProcedure
      .input(z.object({
        strategyId: z.number(),
        notificationsEnabled: z.boolean().optional().default(true),
        autoExecuteEnabled: z.boolean().optional().default(false),
        quantityMultiplier: z.number().optional().default(1),
        maxPositionSize: z.number().nullable().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return subscriptionService.subscribeToStrategy(ctx.user.id, input.strategyId, {
          notificationsEnabled: input.notificationsEnabled,
          autoExecuteEnabled: input.autoExecuteEnabled,
          quantityMultiplier: input.quantityMultiplier,
          maxPositionSize: input.maxPositionSize ?? null,
        });
      }),

    /**
     * Unsubscribe from a strategy
     */
    unsubscribe: protectedProcedure
      .input(z.object({
        strategyId: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        return subscriptionService.unsubscribeFromStrategy(ctx.user.id, input.strategyId);
      }),

    /**
     * Update subscription settings
     */
    updateSettings: protectedProcedure
      .input(z.object({
        strategyId: z.number(),
        notificationsEnabled: z.boolean().optional(),
        autoExecuteEnabled: z.boolean().optional(),
        quantityMultiplier: z.number().optional(),
        maxPositionSize: z.number().nullable().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { strategyId, ...settings } = input;
        return subscriptionService.updateSubscriptionSettings(ctx.user.id, strategyId, settings);
      }),

    /**
     * Get user's pending signals
     */
    pendingSignals: protectedProcedure.query(async ({ ctx }) => {
      return subscriptionService.getUserPendingSignals(ctx.user.id);
    }),

    /**
     * Mark a signal as executed or skipped
     */
    updateSignal: protectedProcedure
      .input(z.object({
        signalId: z.number(),
        action: z.enum(['executed', 'skipped']),
        executionLogId: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return subscriptionService.updateSignalAction(
          input.signalId,
          ctx.user.id,
          input.action,
          input.executionLogId
        );
      }),

    /**
     * Get subscription statistics
     */
    stats: protectedProcedure.query(async ({ ctx }) => {
      return subscriptionService.getUserSubscriptionStats(ctx.user.id);
    }),

    /**
     * Get all available strategies for subscription
     */
    availableStrategies: protectedProcedure.query(async () => {
      return db.getAllStrategies();
    }),

    /**
     * Get user's personalized portfolio analytics
     */
    portfolioAnalytics: protectedProcedure
      .input(z.object({
        timeRange: TimeRange.optional(),
        startingCapital: z.number().optional().default(100000),
      }))
      .query(async ({ ctx, input }) => {
        const { timeRange, startingCapital } = input;
        
        // Get user's subscriptions
        const subscriptions = await subscriptionService.getUserSubscriptions(ctx.user.id);
        if (subscriptions.length === 0) {
          return {
            hasData: false,
            message: 'No subscribed strategies',
            subscriptions: [],
            equityCurve: [],
            underwaterCurve: [],
            metrics: null,
          };
        }

        // Calculate date range
        const now = new Date();
        let startDate: Date | undefined;
        if (timeRange) {
          const year = now.getFullYear();
          switch (timeRange) {
            case '6M': startDate = new Date(now); startDate.setMonth(now.getMonth() - 6); break;
            case 'YTD': startDate = new Date(year, 0, 1); break;
            case '1Y': startDate = new Date(now); startDate.setFullYear(now.getFullYear() - 1); break;
            case '3Y': startDate = new Date(now); startDate.setFullYear(now.getFullYear() - 3); break;
            case '5Y': startDate = new Date(now); startDate.setFullYear(now.getFullYear() - 5); break;
            case '10Y': startDate = new Date(now); startDate.setFullYear(now.getFullYear() - 10); break;
          }
        }

        // Get strategy IDs from subscriptions
        const strategyIds = subscriptions.map(s => s.strategyId);
        
        // Get trades for all subscribed strategies
        const allTrades = await db.getTrades({ strategyIds, startDate, endDate: now });
        
        if (allTrades.length === 0) {
          return {
            hasData: false,
            message: 'No trades in selected time range',
            subscriptions,
            equityCurve: [],
            underwaterCurve: [],
            metrics: null,
          };
        }

        // Apply user's multipliers to trades
        const adjustedTrades = allTrades.map((trade: any) => {
          const sub = subscriptions.find(s => s.strategyId === trade.strategyId);
          const multiplier = Number(sub?.quantityMultiplier) || 1;
          return {
            ...trade,
            pnl: trade.pnl * multiplier,
          };
        });

        // Calculate combined equity curve
        const equityCurve = analytics.calculateEquityCurve(adjustedTrades, startingCapital);
        
        // Calculate underwater curve (returns array directly)
        const underwaterCurve = analytics.calculateUnderwaterCurve(equityCurve);
        
        // Calculate performance metrics
        const metrics = analytics.calculatePerformanceMetrics(adjustedTrades, startingCapital);

        // Calculate monthly returns from equity curve
        const monthlyReturns = analytics.calculateMonthlyReturnsCalendar(equityCurve);

        // Calculate strategy correlation matrix if multiple strategies subscribed
        let strategyCorrelation: { strategyId: number; strategyName: string; correlations: { strategyId: number; correlation: number }[] }[] = [];
        if (strategyIds.length > 1) {
          // Get individual strategy equity curves for correlation
          const strategyCurves = await Promise.all(strategyIds.map(async (sid) => {
            const strategyTrades = await db.getTrades({ strategyIds: [sid], startDate, endDate: now });
            const sub = subscriptions.find(s => s.strategyId === sid);
            const multiplier = Number(sub?.quantityMultiplier) || 1;
            const adjustedStrategyTrades = strategyTrades.map((t: any) => ({ ...t, pnl: t.pnl * multiplier }));
            const curve = analytics.calculateEquityCurve(adjustedStrategyTrades, startingCapital);
            return { strategyId: sid, curve };
          }));

          // Calculate correlation matrix
          for (let i = 0; i < strategyCurves.length; i++) {
            const strategy = strategyCurves[i]!;
            const sub = subscriptions.find(s => s.strategyId === strategy.strategyId);
            const correlations: { strategyId: number; correlation: number }[] = [];
            
            for (let j = 0; j < strategyCurves.length; j++) {
              const otherStrategy = strategyCurves[j]!;
              const corr = analytics.calculateCorrelation(
                strategy.curve,
                otherStrategy.curve
              );
              correlations.push({ strategyId: otherStrategy.strategyId, correlation: corr });
            }
            
            strategyCorrelation.push({
              strategyId: strategy.strategyId,
              strategyName: (sub as any)?.strategy?.name || `Strategy ${strategy.strategyId}`,
              correlations,
            });
          }
        }

        // Get today's trades for the "Today's Activity" section
        // Only show REAL trades from webhook activity, not historical backtest data
        // We identify real trades by checking the webhook_logs table for trades created today
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);
        
        // Get today's webhook logs that resulted in trades
        const todayWebhookLogs = await db.getWebhookLogs({
          status: 'success',
          startDate: todayStart,
          endDate: todayEnd,
          limit: 100,
        });
        
        // Extract trade IDs from successful webhooks
        const webhookTradeIds = new Set(
          todayWebhookLogs
            .filter((log: any) => log.tradeId != null)
            .map((log: any) => log.tradeId)
        );
        
        // Filter allTrades to only include those created by today's webhooks
        // OR check if the trade was created today (by checking createdAt timestamp)
        const todayTrades = allTrades.filter((t: any) => {
          // If trade was created by a webhook today, include it
          if (webhookTradeIds.has(t.id)) return true;
          
          // Also include trades that were created today (createdAt is today)
          // This catches trades created via webhooks that we might have missed
          const createdAt = t.createdAt ? new Date(t.createdAt) : null;
          if (createdAt && createdAt >= todayStart && createdAt <= todayEnd) {
            return true;
          }
          
          return false;
        }).map((t: any) => {
          const sub = subscriptions.find(s => s.strategyId === t.strategyId);
          return {
            id: t.id,
            strategyId: t.strategyId,
            strategyName: (sub as any)?.strategy?.name || `Strategy ${t.strategyId}`,
            symbol: t.symbol,
            direction: t.direction,
            entryDate: t.entryDate,
            entryPrice: t.entryPrice / 100, // Convert from cents to dollars
            exitDate: t.exitDate,
            exitPrice: t.exitPrice ? t.exitPrice / 100 : null, // Convert from cents to dollars
            pnl: (t.pnl / 100) * (Number(sub?.quantityMultiplier) || 1), // Convert from cents to dollars
            isActive: !t.exitDate, // Active if no exit date yet
          };
        });

        // Get S&P 500 benchmark data
        const benchmarkData = await db.getBenchmarkData({ startDate, endDate: now });
        const benchmarkEquityCurve = benchmarkData.length > 0 
          ? benchmarkData.map((b, idx) => {
              // Scale benchmark to match starting capital
              const firstClose = benchmarkData[0]!.close / 100; // cents to dollars
              const currentClose = b.close / 100;
              const scaledEquity = startingCapital * (currentClose / firstClose);
              return {
                date: b.date.toISOString().split('T')[0],
                equity: scaledEquity,
              };
            })
          : [];

        // Calculate benchmark underwater curve
        const benchmarkUnderwaterCurve = benchmarkEquityCurve.length > 0
          ? analytics.calculateUnderwaterCurve(
              benchmarkEquityCurve.map(b => ({ date: new Date(b.date), equity: b.equity, drawdown: 0 }))
            ).map((p: { date: Date; drawdownPercent: number }) => ({
              date: p.date.toISOString().split('T')[0],
              drawdown: p.drawdownPercent,
            }))
          : [];

        return {
          hasData: true,
          subscriptions,
          todayTrades,
          equityCurve: equityCurve.map((p: { date: Date; equity: number }) => ({
            date: p.date.toISOString().split('T')[0],
            equity: p.equity,
          })),
          underwaterCurve: underwaterCurve.map((p: { date: Date; drawdownPercent: number }) => ({
            date: p.date.toISOString().split('T')[0],
            drawdown: p.drawdownPercent,
          })),
          benchmarkEquityCurve,
          benchmarkUnderwaterCurve,
          monthlyReturns: monthlyReturns.map(m => ({
            year: m.year,
            month: m.month,
            monthName: m.monthName,
            return: m.return,
          })),
          strategyCorrelation,
          metrics: {
            totalReturn: metrics.totalReturn,
            annualizedReturn: metrics.annualizedReturn,
            sharpeRatio: metrics.sharpeRatio,
            sortinoRatio: metrics.sortinoRatio,
            maxDrawdown: metrics.maxDrawdown,
            winRate: metrics.winRate,
            profitFactor: metrics.profitFactor,
            calmarRatio: metrics.calmarRatio,
            totalTrades: metrics.totalTrades,
            avgWin: metrics.avgWin,
            avgLoss: metrics.avgLoss,
          },
        };
      }),

    /**
     * Get individual strategy equity curves for comparison
     */
    strategyEquityCurves: protectedProcedure
      .input(z.object({
        timeRange: TimeRange.optional(),
        startingCapital: z.number().optional().default(100000),
      }))
      .query(async ({ ctx, input }) => {
        const { timeRange, startingCapital } = input;
        
        // Get user's subscriptions
        const subscriptions = await subscriptionService.getUserSubscriptions(ctx.user.id);
        if (subscriptions.length === 0) {
          return { curves: [] };
        }

        // Calculate date range
        const now = new Date();
        let startDate: Date | undefined;
        if (timeRange) {
          const year = now.getFullYear();
          switch (timeRange) {
            case '6M': startDate = new Date(now); startDate.setMonth(now.getMonth() - 6); break;
            case 'YTD': startDate = new Date(year, 0, 1); break;
            case '1Y': startDate = new Date(now); startDate.setFullYear(now.getFullYear() - 1); break;
            case '3Y': startDate = new Date(now); startDate.setFullYear(now.getFullYear() - 3); break;
            case '5Y': startDate = new Date(now); startDate.setFullYear(now.getFullYear() - 5); break;
            case '10Y': startDate = new Date(now); startDate.setFullYear(now.getFullYear() - 10); break;
          }
        }

        // Get equity curve for each subscribed strategy
        const curves = await Promise.all(subscriptions.map(async (sub) => {
          const trades = await db.getTrades({ strategyIds: [sub.strategyId], startDate, endDate: now });
          const multiplier = Number(sub.quantityMultiplier) || 1;
          const adjustedTrades = trades.map((t: any) => ({ ...t, pnl: t.pnl * multiplier }));
          const equityCurve = analytics.calculateEquityCurve(adjustedTrades, startingCapital);
          
          return {
            strategyId: sub.strategyId,
            strategyName: (sub as any).strategyName || `Strategy ${sub.strategyId}`,
            multiplier,
            curve: equityCurve.map(p => ({
              date: p.date.toISOString().split('T')[0],
              equity: p.equity,
            })),
          };
        }));

        return { curves };
      }),

    /**
     * Update advanced strategy settings (position sizing, variance, etc.)
     */
    updateAdvancedSettings: protectedProcedure
      .input(z.object({
        strategyId: z.number(),
        notificationsEnabled: z.boolean().optional(),
        autoExecuteEnabled: z.boolean().optional(),
        quantityMultiplier: z.number().optional(),
        maxPositionSize: z.number().nullable().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { strategyId, ...settings } = input;
        return subscriptionService.updateSubscriptionSettings(ctx.user.id, strategyId, settings);
      }),
  }),

  // Notification preferences router
  notifications: router({
    /**
     * Get user's notification preferences
     */
    getPreferences: protectedProcedure.query(async ({ ctx }) => {
      const prefs = await db.getNotificationPreferences(ctx.user.id);
      const strategies = await db.getStrategiesWithNotificationSettings(ctx.user.id);
      
      return {
        global: prefs || {
          emailNotificationsEnabled: true,
          pushNotificationsEnabled: true,
          notifyOnEntry: true,
          notifyOnExit: true,
          notifyOnProfit: true,
          notifyOnLoss: true,
          quietHoursStart: null,
          quietHoursEnd: null,
          quietHoursTimezone: 'America/New_York',
        },
        strategies,
      };
    }),

    /**
     * Update global notification preferences
     */
    updateGlobalPreferences: protectedProcedure
      .input(z.object({
        emailNotificationsEnabled: z.boolean().optional(),
        pushNotificationsEnabled: z.boolean().optional(),
        notifyOnEntry: z.boolean().optional(),
        notifyOnExit: z.boolean().optional(),
        notifyOnProfit: z.boolean().optional(),
        notifyOnLoss: z.boolean().optional(),
        quietHoursStart: z.string().nullable().optional(),
        quietHoursEnd: z.string().nullable().optional(),
        quietHoursTimezone: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.upsertNotificationPreferences(ctx.user.id, input);
        return { success: true };
      }),

    /**
     * Toggle notifications for a specific strategy
     */
    toggleStrategy: protectedProcedure
      .input(z.object({
        strategyId: z.number(),
        emailEnabled: z.boolean().optional(),
        pushEnabled: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { strategyId, ...settings } = input;
        await db.upsertStrategyNotificationSetting(ctx.user.id, strategyId, settings);
        return { success: true };
      }),

    /**
     * Bulk update strategy notification settings
     */
    bulkUpdateStrategies: protectedProcedure
      .input(z.object({
        strategies: z.array(z.object({
          strategyId: z.number(),
          emailEnabled: z.boolean(),
          pushEnabled: z.boolean(),
        })),
      }))
      .mutation(async ({ ctx, input }) => {
        await Promise.all(
          input.strategies.map(s => 
            db.upsertStrategyNotificationSetting(ctx.user.id, s.strategyId, {
              emailEnabled: s.emailEnabled,
              pushEnabled: s.pushEnabled,
            })
          )
        );
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
