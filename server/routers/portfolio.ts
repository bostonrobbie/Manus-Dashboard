import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  ENGINE_CONFIG,
  buildAggregatedEquityCurve,
  buildDrawdownCurves,
  buildPortfolioOverview,
  computeDailyReturns,
  computeSharpeRatio,
  loadStrategies,
  loadTrades,
  runMonteCarloSimulation,
} from "../portfolio-engine";
import { protectedProcedure, requireUser, router } from "../_core/trpc";
import { ingestBenchmarksCsv } from "../services/benchmarkIngestion";
import { TIME_RANGE_PRESETS, deriveDateRangeFromTimeRange } from "../utils/timeRange";
import { env } from "../utils/env";
import type { SharedAuthUser } from "@shared/types/auth";
import { createLogger } from "../utils/logger";
import {
  getCustomPortfolioAnalytics,
  getPortfolioSummaryCsv,
  getPortfolioSummaryMetrics,
  getPortfolioTrades,
  getStrategyAnalytics,
  ingestTradesFromCsv,
} from "../services/tradePipeline";
import type { EquityCurvePoint, TimeRange, TradeRow } from "@shared/types/portfolio";
import {
  PortfolioContractTimeRange,
  buildCombinedEquityFromReturns,
  buildCorrelationMatrix,
  buildDateIndex,
  buildDrawdownCurve,
  computeBreakdown,
  computeDailyReturnSeries,
  computeMetricBundle,
  deriveRangeFromContractTimeRange,
  forwardFillEquity,
} from "@server/core/portfolioMetrics";

const finiteNumber = z.number().finite();
const equityPointSchema = z.object({
  date: z.string(),
  combined: finiteNumber,
  swing: finiteNumber,
  intraday: finiteNumber,
  spx: finiteNumber,
});
const drawdownPointSchema = z.object({
  date: z.string(),
  combined: finiteNumber,
  swing: finiteNumber,
  intraday: finiteNumber,
  spx: finiteNumber,
});
const workspaceMetricsSchema = z.object({
  totalReturnPct: finiteNumber,
  cagrPct: finiteNumber,
  volatilityPct: finiteNumber,
  sharpe: finiteNumber,
  sortino: finiteNumber,
  calmar: finiteNumber,
  maxDrawdownPct: finiteNumber,
  winRatePct: finiteNumber,
  lossRatePct: finiteNumber,
  avgWin: finiteNumber,
  avgLoss: finiteNumber,
  payoffRatio: finiteNumber,
  profitFactor: finiteNumber,
  expectancyPerTrade: finiteNumber,
  alpha: finiteNumber.nullable(),
});
const emptyWorkspaceMetrics = workspaceMetricsSchema.parse({
  totalReturnPct: 0,
  cagrPct: 0,
  volatilityPct: 0,
  sharpe: 0,
  sortino: 0,
  calmar: 0,
  maxDrawdownPct: 0,
  winRatePct: 0,
  lossRatePct: 0,
  avgWin: 0,
  avgLoss: 0,
  payoffRatio: 0,
  profitFactor: 0,
  expectancyPerTrade: 0,
  alpha: null,
});
const summarySchema = z.object({
  totalReturnPct: finiteNumber,
  maxDrawdownPct: finiteNumber,
  sharpeRatio: finiteNumber,
  winRatePct: finiteNumber,
});
const strategyRowSchema = z.object({
  strategyId: z.number().int(),
  name: z.string(),
  type: z.enum(["swing", "intraday"]),
  totalReturn: finiteNumber,
  totalReturnPct: finiteNumber,
  maxDrawdown: finiteNumber,
  maxDrawdownPct: finiteNumber,
  sharpeRatio: finiteNumber,
  sortinoRatio: finiteNumber.optional(),
  cagr: finiteNumber.optional(),
  calmar: finiteNumber.optional(),
  winRatePct: finiteNumber,
  lossRatePct: finiteNumber.optional(),
  totalTrades: z.number().int(),
  profitFactor: finiteNumber,
  expectancy: finiteNumber.optional(),
  payoffRatio: finiteNumber.optional(),
  sparkline: z
    .array(
      z.object({
        date: z.string(),
        value: finiteNumber,
      }),
    )
    .optional(),
});
const monteCarloSchema = z.object({
  futureDates: z.array(z.string()),
  p10: z.array(finiteNumber),
  p50: z.array(finiteNumber),
  p90: z.array(finiteNumber),
  currentEquity: finiteNumber,
  finalEquities: z.array(finiteNumber),
});
const exportTradesResponseSchema = z.object({
  filename: z.string(),
  mimeType: z.string(),
  content: z.string(),
});
const tradeRowSchema = z.object({
  id: z.number().int(),
  userId: z.number().int().optional(),
  strategyId: z.number().int(),
  symbol: z.string(),
  side: z.string(),
  quantity: finiteNumber,
  entryPrice: finiteNumber,
  exitPrice: finiteNumber,
  entryTime: z.string(),
  exitTime: z.string(),
  initialRisk: finiteNumber.optional(),
});
const ingestionHeaderIssuesSchema = z
  .object({ missing: z.array(z.string()), unexpected: z.array(z.string()) })
  .optional();
const tradeIngestionResultSchema = z.object({
  importedCount: z.number().int(),
  skippedCount: z.number().int(),
  failedCount: z.number().int(),
  errors: z.array(z.string()),
  warnings: z.array(z.string()),
  uploadId: z.number().int().optional(),
  headerIssues: ingestionHeaderIssuesSchema,
});
const benchmarkIngestionResultSchema = tradeIngestionResultSchema;
const customPortfolioContributionSchema = z.object({
  strategyId: z.number().int(),
  name: z.string(),
  weight: z.number(),
  totalReturnPct: finiteNumber,
  maxDrawdownPct: finiteNumber,
  sharpeRatio: finiteNumber,
  tradeCount: z.number().int(),
});

const dateRangeSchema = z
  .object({
    startDate: z.string().optional(),
    endDate: z.string().optional(),
  })
  .optional();

const overviewPointSchema = z.object({ date: z.string(), equity: finiteNumber });
const overviewHealthSchema = z.object({
  hasTrades: z.boolean(),
  firstTradeDate: z.string().nullable(),
  lastTradeDate: z.string().nullable(),
});

const homeOverviewSchema = z.object({
  portfolioEquity: z.array(overviewPointSchema),
  todayPnl: finiteNumber,
  mtdPnl: finiteNumber,
  ytdPnl: finiteNumber,
  maxDrawdown: finiteNumber,
  openRisk: finiteNumber.nullable(),
  accountValue: finiteNumber.nullable(),
  dataHealth: overviewHealthSchema,
});

const equityCurveResponseSchema = z.object({ points: z.array(equityPointSchema) });

const positionSchema = z.object({
  symbol: z.string(),
  strategyId: z.number().int().nullable(),
  side: z.enum(["long", "short", "flat"]),
  quantity: finiteNumber,
  avgEntry: finiteNumber,
  marketValue: finiteNumber,
  unrealizedPnl: finiteNumber,
  realizedPnl: finiteNumber,
  lastTradeAt: z.string(),
  status: z.enum(["open", "closed"]),
});

const positionsResponseSchema = z.object({ positions: z.array(positionSchema) });

const analyticsPayloadSchema = z.object({
  metrics: workspaceMetricsSchema,
  equityCurve: z.array(equityPointSchema),
  drawdowns: z.array(drawdownPointSchema),
  dailyReturns: z.array(finiteNumber),
  tradeCount: z.number().int(),
});

const strategyEquityPointSchema = z.object({ date: z.string(), equity: finiteNumber });
const strategyStatsSchema = z.object({
  sharpe: finiteNumber.nullable(),
  maxDrawdown: finiteNumber,
  winRate: finiteNumber.nullable(),
  tradeCount: z.number().int(),
  startDate: z.string().nullable(),
  endDate: z.string().nullable(),
});

const strategySummarySchema = z.object({
  strategyId: z.string(),
  name: z.string(),
  instrument: z.string().nullable(),
  equityCurve: z.array(strategyEquityPointSchema),
  stats: strategyStatsSchema,
});

const MAX_UPLOAD_BYTES = env.maxUploadBytes ?? 5 * 1024 * 1024;

const timeRangeInput = z
  .object({
    preset: z.enum(TIME_RANGE_PRESETS),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
  })
  .optional();

const contractTimeRangeInput: z.ZodType<PortfolioContractTimeRange> = z.enum(
  ["YTD", "1Y", "3Y", "5Y", "ALL"] as const,
);

const resolveScope = async (ctx: { user: SharedAuthUser | null }) => {
  const user = requireUser(ctx as any);
  return { user };
};

export function enforceUploadGuards(csv: string, fileName?: string) {
  const sizeBytes = Buffer.byteLength(csv, "utf8");
  if (sizeBytes > MAX_UPLOAD_BYTES) {
    throw new TRPCError({
      code: "PAYLOAD_TOO_LARGE",
      message: `File exceeds maximum size of ${formatBytes(MAX_UPLOAD_BYTES)}`,
    });
  }

  if (fileName) {
    const lower = fileName.toLowerCase();
    if (!(lower.endsWith(".csv") || lower.endsWith(".txt"))) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Only CSV uploads are allowed",
      });
    }
  }

  if (!csv.trim()) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "CSV content is empty" });
  }
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 102.4) / 10} KB`;
  return `${Math.round(bytes / 104857.6) / 10} MB`;
}

const portfolioLogger = createLogger("portfolio-router");
const DEFAULT_LOOKBACK_DAYS = 90;
const STARTING_BALANCE = 10_000;

type TradeForOverview = {
  side: string;
  entryPrice: unknown;
  exitPrice: unknown;
  quantity: unknown;
  exitTime: string;
};

const toIsoDate = (date: Date) => date.toISOString().slice(0, 10);

const previousIsoDay = (isoDate: string) => {
  const date = new Date(`${isoDate}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() - 1);
  return toIsoDate(date);
};

const resolveDateRange = (input?: { startDate?: string; endDate?: string; timeRange?: TimeRange }) => {
  const derived = input?.timeRange ? deriveDateRangeFromTimeRange(input.timeRange) : {};
  const today = new Date();
  const endDate = input?.endDate ?? (derived as any).endDate ?? toIsoDate(today);
  if (input?.startDate) {
    const start = input.startDate > endDate ? endDate : input.startDate;
    return { startDate: start, endDate };
  }

  const start = new Date(`${endDate}T00:00:00.000Z`);
  start.setUTCDate(start.getUTCDate() - DEFAULT_LOOKBACK_DAYS + 1);
  const startDate = (derived as any).startDate ?? toIsoDate(start);
  return { startDate, endDate };
};

const tradePnl = (side: string, entry: number, exit: number, qty: number) => {
  const normalizedSide = side.toLowerCase();
  return normalizedSide === "short" || normalizedSide === "sell" ? (entry - exit) * qty : (exit - entry) * qty;
};

const computeHoldingPeriodDays = (trade: TradeRow) => {
  const entry = new Date(trade.entryTime);
  const exit = new Date(trade.exitTime);
  const diff = exit.getTime() - entry.getTime();
  if (!Number.isFinite(diff) || diff <= 0) return 0;
  return diff / (1000 * 60 * 60 * 24);
};

const buildCumulativePnlSeries = (
  trades: TradeForOverview[],
  range: { startDate?: string; endDate?: string },
): { date: string; cumulative: number }[] => {
  const pnlByDate = new Map<string, number>();

  for (const trade of trades) {
    const exitDate = trade.exitTime.slice(0, 10);
    if (range.startDate && exitDate < range.startDate) continue;
    if (range.endDate && exitDate > range.endDate) continue;
    const pnl = tradePnl(trade.side, Number(trade.entryPrice), Number(trade.exitPrice), Number(trade.quantity));
    pnlByDate.set(exitDate, (pnlByDate.get(exitDate) ?? 0) + pnl);
  }

  const dates = Array.from(pnlByDate.keys()).sort();
  const cumulative: { date: string; cumulative: number }[] = [];
  let total = 0;

  for (const d of dates) {
    total += pnlByDate.get(d) ?? 0;
    cumulative.push({ date: d, cumulative: total });
  }

  return cumulative;
};

const valueOnOrBefore = (series: { date: string; cumulative: number }[], targetDate: string) => {
  let value = 0;
  for (const point of series) {
    if (point.date > targetDate) break;
    value = point.cumulative;
  }
  return value;
};

const computeMaxDrawdownFromSeries = (series: { date: string; cumulative: number }[]) => {
  let peak = STARTING_BALANCE;
  let maxDrawdown = 0;

  for (const point of series) {
    const equity = STARTING_BALANCE + point.cumulative;
    peak = Math.max(peak, equity);
    const drawdown = equity - peak;
    if (drawdown < maxDrawdown) {
      maxDrawdown = drawdown;
    }
  }

  return maxDrawdown;
};

export const portfolioRouter = router({
  getOverview: protectedProcedure
    .input(
      z
        .object({
          dateRange: dateRangeSchema,
          timeRange: timeRangeInput,
          strategyId: z.number().int().nullable().optional(),
        })
        .optional(),
    )
    .output(homeOverviewSchema)
    .query(async ({ ctx, input }) => {
      const { user } = await resolveScope(ctx);
      const scope = { userId: user.id };
      const range = resolveDateRange({ ...input?.dateRange, timeRange: input?.timeRange });
      const strategyFilter = input?.strategyId ? [input.strategyId] : undefined;
      try {
        const trades = await loadTrades(scope, { strategyIds: strategyFilter });
        const tradesInRange = trades.filter(trade => {
          const exitDate = trade.exitTime.slice(0, 10);
          if (range.startDate && exitDate < range.startDate) return false;
          if (range.endDate && exitDate > range.endDate) return false;
          return true;
        });

        const equityCurve = await buildAggregatedEquityCurve(scope, {
          startDate: range.startDate,
          endDate: range.endDate,
          strategyIds: strategyFilter ?? undefined,
        });

        const pnlSeries = buildCumulativePnlSeries(tradesInRange, range);
        const effectiveEnd = range.endDate ?? toIsoDate(new Date());
        const equityPoints = equityCurve.points.map(point => ({
          date: point.date,
          equity: STARTING_BALANCE + point.combined,
        }));

        const latestEquity = equityPoints.at(-1)?.equity ?? (tradesInRange.length ? STARTING_BALANCE : null);
        const todayPnl = valueOnOrBefore(pnlSeries, effectiveEnd) - valueOnOrBefore(pnlSeries, previousIsoDay(effectiveEnd));
        const monthStart = `${effectiveEnd.slice(0, 8)}01`;
        const mtdPnl = valueOnOrBefore(pnlSeries, effectiveEnd) - valueOnOrBefore(pnlSeries, previousIsoDay(monthStart));
        const yearStart = `${effectiveEnd.slice(0, 4)}-01-01`;
        const ytdPnl = valueOnOrBefore(pnlSeries, effectiveEnd) - valueOnOrBefore(pnlSeries, previousIsoDay(yearStart));
        const maxDrawdown = computeMaxDrawdownFromSeries(pnlSeries);

        const firstTrade = tradesInRange.length
          ? tradesInRange.reduce((min, t) => (t.exitTime < min ? t.exitTime : min), tradesInRange[0].exitTime)
          : null;
        const lastTrade = tradesInRange.length
          ? tradesInRange.reduce((max, t) => (t.exitTime > max ? t.exitTime : max), tradesInRange[0].exitTime)
          : null;

        return homeOverviewSchema.parse({
          portfolioEquity: equityPoints,
          todayPnl,
          mtdPnl,
          ytdPnl,
          maxDrawdown,
          openRisk: null,
          accountValue: latestEquity,
          dataHealth: {
            hasTrades: tradesInRange.length > 0,
            firstTradeDate: firstTrade ? firstTrade.slice(0, 10) : null,
            lastTradeDate: lastTrade ? lastTrade.slice(0, 10) : null,
          },
        });
      } catch (error) {
        portfolioLogger.error("Home dashboard getOverview failed", {
          procedure: "getOverview",
          userId: user.id,
          range,
          error: error instanceof Error ? error.message : String(error),
        });
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Unable to load portfolio overview" });
      }
    }),
  getStrategySummaries: protectedProcedure
    .input(
      z
        .object({
          dateRange: dateRangeSchema,
          timeRange: timeRangeInput,
        })
        .optional(),
    )
    .output(z.array(strategySummarySchema))
    .query(async ({ ctx, input }) => {
      const { user } = await resolveScope(ctx);
      const scope = { userId: user.id };
      const range = resolveDateRange({ ...input?.dateRange, timeRange: input?.timeRange });
      try {
        const [strategies, trades] = await Promise.all([
          loadStrategies(scope),
          loadTrades(scope),
        ]);

        const tradesInRange = trades.filter(trade => {
          const exitDate = trade.exitTime.slice(0, 10);
          if (range.startDate && exitDate < range.startDate) return false;
          if (range.endDate && exitDate > range.endDate) return false;
          return true;
        });

        return strategies.map(strategy => {
          const strategyTrades = tradesInRange.filter(t => t.strategyId === strategy.id);
          const equitySeries = buildCumulativePnlSeries(strategyTrades, range);

          const equityCurve = equitySeries.map(point => ({
            date: point.date,
            equity: STARTING_BALANCE + point.cumulative,
          }));

          const equityPointsForStats: EquityCurvePoint[] = equitySeries.map(point => ({
            date: point.date,
            combined: point.cumulative,
            swing: point.cumulative,
            intraday: 0,
            spx: 0,
          }));

          const returns = computeDailyReturns(equityPointsForStats, ENGINE_CONFIG.initialCapital);
          const sharpe = returns.length ? computeSharpeRatio(returns.filter(r => Number.isFinite(r))) : 0;
          const maxDrawdown = computeMaxDrawdownFromSeries(equitySeries);

          const wins = strategyTrades.filter(trade =>
            tradePnl(trade.side, Number(trade.entryPrice), Number(trade.exitPrice), Number(trade.quantity)) > 0,
          ).length;
          const tradeCount = strategyTrades.length;
          const winRate = tradeCount ? (wins / tradeCount) * 100 : null;

          const firstTrade = strategyTrades.length
            ? strategyTrades.reduce((min, t) => (t.exitTime < min ? t.exitTime : min), strategyTrades[0].exitTime)
            : null;
          const lastTrade = strategyTrades.length
            ? strategyTrades.reduce((max, t) => (t.exitTime > max ? t.exitTime : max), strategyTrades[0].exitTime)
            : null;

          return strategySummarySchema.parse({
            strategyId: String(strategy.id),
            name: strategy.name,
            instrument: strategy.type ?? null,
            equityCurve,
            stats: {
              sharpe: strategyTrades.length ? sharpe : null,
              maxDrawdown,
              winRate,
              tradeCount,
              startDate: firstTrade ? firstTrade.slice(0, 10) : null,
              endDate: lastTrade ? lastTrade.slice(0, 10) : null,
            },
          });
        });
      } catch (error) {
        portfolioLogger.error("Home dashboard getStrategySummaries failed", {
          procedure: "getStrategySummaries",
          userId: user.id,
          range,
          error: error instanceof Error ? error.message : String(error),
        });
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Unable to load strategy summaries" });
      }
    }),
  overview: protectedProcedure
    .input(
      z.object({
        timeRange: contractTimeRangeInput,
        startingCapital: z.number().default(100000),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { user } = await resolveScope(ctx);
      const scope = { userId: user.id };
      const range = deriveRangeFromContractTimeRange(input.timeRange);
      const startingCapital = input.startingCapital;

      try {
        const [equityCurve, trades] = await Promise.all([
          buildAggregatedEquityCurve(scope, { startDate: range.startDate, endDate: range.endDate }),
          loadTrades(scope, { startDate: range.startDate, endDate: range.endDate }),
        ]);

        const equityPoints = equityCurve.points.sort((a, b) => a.date.localeCompare(b.date));
        const portfolioCurve = equityPoints.map(point => ({
          date: point.date,
          equity: startingCapital + point.combined,
        }));
        const spyCurve = equityPoints.map(point => ({
          date: point.date,
          equity: startingCapital + point.spx,
        }));

        const drawdownPortfolio = buildDrawdownCurve(portfolioCurve);
        const drawdownSpy = buildDrawdownCurve(spyCurve);
        const drawdownCurve = drawdownPortfolio.map((p, idx) => ({
          date: p.date,
          portfolio: p.equity,
          spy: drawdownSpy[idx]?.equity ?? 0,
        }));

        const tradeSamples = trades.map(t => ({
          pnl: tradePnl(t.side, Number(t.entryPrice), Number(t.exitPrice), Number(t.quantity)),
          initialRisk: (t as any).initialRisk ? Number((t as any).initialRisk) : undefined,
          holdingPeriodDays: computeHoldingPeriodDays(t),
        }));

        const metricsPortfolio = computeMetricBundle({ equityCurve: portfolioCurve, trades: tradeSamples });
        const metricsSpy = computeMetricBundle({ equityCurve: spyCurve });

        const breakdownPortfolio = computeBreakdown(portfolioCurve);
        const breakdownSpy = computeBreakdown(spyCurve);

        const portfolioEquity = portfolioCurve.at(-1)?.equity ?? startingCapital;
        const totalReturnValue = portfolioEquity - startingCapital;
        const winRatePct = metricsPortfolio.winRate;
        const lossRatePct = metricsPortfolio.lossRatePct ?? Math.max(0, 100 - winRatePct);
        const winningTrades = tradeSamples.filter(t => t.pnl > 0).length;
        const losingTrades = tradeSamples.filter(t => t.pnl < 0).length;
        const maxDrawdownPct = drawdownPortfolio.reduce((min, p) => Math.min(min, p.equity), 0);
        const maxDrawdownValue = portfolioEquity * Math.abs(maxDrawdownPct) * 0.01;

        return {
          equityCurve: portfolioCurve.map((point, idx) => ({
            date: point.date,
            portfolio: point.equity,
            spy: spyCurve[idx]?.equity ?? startingCapital,
          })),
          drawdownCurve,
          metrics: {
            portfolio: metricsPortfolio,
            spy: metricsSpy,
          },
          breakdown: {
            daily: { portfolio: breakdownPortfolio.daily, spy: breakdownSpy.daily },
            weekly: { portfolio: breakdownPortfolio.weekly, spy: breakdownSpy.weekly },
            monthly: { portfolio: breakdownPortfolio.monthly, spy: breakdownSpy.monthly },
            quarterly: { portfolio: breakdownPortfolio.quarterly, spy: breakdownSpy.quarterly },
            ytd: { portfolio: breakdownPortfolio.ytd, spy: breakdownSpy.ytd },
          },
          equity: portfolioEquity,
          totalReturn: totalReturnValue,
          profitFactor: metricsPortfolio.profitFactor,
          maxDrawdown: maxDrawdownValue,
          sharpeRatio: metricsPortfolio.sharpe,
          sortinoRatio: metricsPortfolio.sortino,
          winRate: winRatePct / 100,
          lossRate: lossRatePct / 100,
          maxDrawdownPct,
          totalTrades: tradeSamples.length,
          winningTrades,
          losingTrades,
          expectancy: metricsPortfolio.expectancyPerTrade ?? 0,
        };
      } catch (error) {
        portfolioLogger.error("portfolio.overview failed", {
          procedure: "overview",
          userId: user.id,
          range,
          error: error instanceof Error ? error.message : String(error),
        });
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Unable to load portfolio overview" });
      }
    }),
  strategyDetail: protectedProcedure
    .input(
      z.object({
        strategyId: z.number(),
        timeRange: contractTimeRangeInput,
        startingCapital: z.number().default(100000),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { user } = await resolveScope(ctx);
      const scope = { userId: user.id };
      const range = deriveRangeFromContractTimeRange(input.timeRange);

      try {
        const strategies = await loadStrategies(scope);
        const strategy = strategies.find(s => s.id === input.strategyId);
        if (!strategy) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Strategy not found" });
        }

        const [equityCurve, trades] = await Promise.all([
          buildAggregatedEquityCurve(scope, {
            startDate: range.startDate,
            endDate: range.endDate,
            strategyIds: [strategy.id],
          }),
          loadTrades(scope, { startDate: range.startDate, endDate: range.endDate, strategyIds: [strategy.id] }),
        ]);

        const orderedPoints = equityCurve.points.sort((a, b) => a.date.localeCompare(b.date));
        const strategyCurve = orderedPoints.map(point => ({
          date: point.date,
          equity: input.startingCapital + point.combined,
        }));

        const drawdownCurve = buildDrawdownCurve(strategyCurve).map(point => ({
          date: point.date,
          drawdown: point.equity,
        }));

        const tradeSamples = trades.map(t => ({
          pnl: tradePnl(t.side, Number(t.entryPrice), Number(t.exitPrice), Number(t.quantity)),
          initialRisk: (t as any).initialRisk ? Number((t as any).initialRisk) : undefined,
          holdingPeriodDays: computeHoldingPeriodDays(t),
        }));

        const metrics = computeMetricBundle({ equityCurve: strategyCurve, trades: tradeSamples });
        const breakdown = computeBreakdown(strategyCurve);
        const recentTrades = trades
          .sort((a, b) => b.exitTime.localeCompare(a.exitTime))
          .slice(0, 20)
          .map(t => {
            const qty = Number(t.quantity) || 0;
            const entryPrice = Number(t.entryPrice) || 0;
            const pnl = tradePnl(t.side, entryPrice, Number(t.exitPrice), qty);
            const notional = Math.abs(entryPrice * qty);
            const pnlPercent = notional > 0 ? (pnl / notional) * 100 : 0;

            return {
              id: t.id,
              symbol: t.symbol,
              side: t.side,
              entryPrice: Number(t.entryPrice),
              exitPrice: Number(t.exitPrice),
              entryTime: t.entryTime,
              exitTime: t.exitTime,
              pnl,
              pnlPercent,
            };
          });

        return {
          strategy: {
            id: strategy.id,
            name: strategy.name,
            description: strategy.description ?? "",
            type: strategy.type,
            symbol: (strategy as any).symbol ?? trades[0]?.symbol ?? "",
          },
          equityCurve: strategyCurve,
          drawdownCurve,
          metrics,
          recentTrades,
          breakdown,
        };
      } catch (error) {
        portfolioLogger.error("portfolio.strategyDetail failed", {
          procedure: "strategyDetail",
          userId: user.id,
          input,
          error: error instanceof Error ? error.message : String(error),
        });
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Unable to load strategy detail" });
      }
    }),
  compareStrategies: protectedProcedure
    .input(
      z.object({
        strategyIds: z.array(z.number()),
        timeRange: contractTimeRangeInput,
        startingCapital: z.number().default(100000),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { user } = await resolveScope(ctx);
      const scope = { userId: user.id };
      const range = deriveRangeFromContractTimeRange(input.timeRange);

      if (input.strategyIds.length < 2 || input.strategyIds.length > 4) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Please select between 2 and 4 strategies" });
      }

      try {
        const [trades, equityResponses] = await Promise.all([
          loadTrades(scope, {
            startDate: range.startDate,
            endDate: range.endDate,
            strategyIds: input.strategyIds,
          }),
          Promise.all(
            input.strategyIds.map(async id => ({
              id,
              curve: await buildAggregatedEquityCurve(scope, {
                startDate: range.startDate,
                endDate: range.endDate,
                strategyIds: [id],
              }),
            })),
          ),
        ]);

        const allPoints = equityResponses.flatMap(r => r.curve.points);
        const earliestPoint = allPoints.length ? allPoints.reduce((min, p) => (p.date < min.date ? p : min)) : null;
        const latestPoint = allPoints.length ? allPoints.reduce((max, p) => (p.date > max.date ? p : max)) : null;
        const startDate = range.startDate ?? earliestPoint?.date;
        const endDate = range.endDate ?? latestPoint?.date ?? deriveRangeFromContractTimeRange(input.timeRange).endDate;

        if (!startDate || !endDate) {
          return {
            individualCurves: {},
            combinedCurve: [],
            correlationMatrix: { strategyIds: input.strategyIds, matrix: [] },
            combinedMetrics: computeMetricBundle({ equityCurve: [] }),
            individualMetrics: {},
          };
        }

        const dateIndex = buildDateIndex(startDate, endDate);
        const individualCurves: Record<string, { date: string; equity: number }[]> = {};
        const dailyReturnMap: Record<number, number[]> = {};
        const individualMetrics: Record<string, ReturnType<typeof computeMetricBundle>> = {};

        for (const response of equityResponses) {
          const equitySeries = response.curve.points
            .sort((a, b) => a.date.localeCompare(b.date))
            .map(point => ({ date: point.date, equity: input.startingCapital + point.combined }));
          const filled = forwardFillEquity(equitySeries, dateIndex, input.startingCapital);
          individualCurves[response.id.toString()] = filled;
          const returns = [0, ...computeDailyReturnSeries(filled)];
          dailyReturnMap[response.id] = returns;
          const strategyTrades = trades.filter(t => t.strategyId === response.id);
          individualMetrics[response.id.toString()] = computeMetricBundle({
            equityCurve: filled,
            trades: strategyTrades.map(t => ({
              pnl: tradePnl(t.side, Number(t.entryPrice), Number(t.exitPrice), Number(t.quantity)),
              initialRisk: (t as any).initialRisk ? Number((t as any).initialRisk) : undefined,
              holdingPeriodDays: computeHoldingPeriodDays(t),
            })),
          });
        }

        const combinedCurve = buildCombinedEquityFromReturns(dateIndex, Object.values(dailyReturnMap), input.startingCapital);
        const combinedMetrics = computeMetricBundle({
          equityCurve: combinedCurve,
          trades: trades.map(t => ({
            pnl: tradePnl(t.side, Number(t.entryPrice), Number(t.exitPrice), Number(t.quantity)),
            initialRisk: (t as any).initialRisk ? Number((t as any).initialRisk) : undefined,
            holdingPeriodDays: computeHoldingPeriodDays(t),
          })),
        });

        const correlationMatrix = {
          strategyIds: input.strategyIds,
          matrix: buildCorrelationMatrix(dailyReturnMap, input.strategyIds),
        };

        return {
          individualCurves,
          combinedCurve,
          correlationMatrix,
          combinedMetrics,
          individualMetrics,
        };
      } catch (error) {
        portfolioLogger.error("portfolio.compareStrategies failed", {
          procedure: "compareStrategies",
          userId: user.id,
          input,
          error: error instanceof Error ? error.message : String(error),
        });
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Unable to compare strategies" });
      }
    }),
  equityCurves: protectedProcedure
    .input(
      z
        .object({
          startDate: z.string().optional(),
          endDate: z.string().optional(),
          maxPoints: z.number().int().positive().optional(),
          timeRange: timeRangeInput,
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const { user } = await resolveScope(ctx);
      const range = deriveDateRangeFromTimeRange(input?.timeRange);
      const scope = { userId: user.id };
      const res = await buildAggregatedEquityCurve(scope, {
        startDate: input?.startDate ?? range.startDate,
        endDate: input?.endDate ?? range.endDate,
        maxPoints: input?.maxPoints,
      });
      return { points: res.points.map(p => equityPointSchema.parse(p)) };
    }),
  drawdowns: protectedProcedure
    .input(
      z
        .object({
          startDate: z.string().optional(),
          endDate: z.string().optional(),
          maxPoints: z.number().int().positive().optional(),
          timeRange: timeRangeInput,
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const { user } = await resolveScope(ctx);
      const range = deriveDateRangeFromTimeRange(input?.timeRange);
      const scope = { userId: user.id };
      const res = await buildDrawdownCurves(scope, {
        startDate: input?.startDate ?? range.startDate,
        endDate: input?.endDate ?? range.endDate,
        maxPoints: input?.maxPoints,
      });
      return { points: res.points.map(p => drawdownPointSchema.parse(p)) };
    }),
  strategyEquity: protectedProcedure
    .input(
      z.object({
        strategyId: z.number().int(),
        timeRange: timeRangeInput,
        maxPoints: z.number().int().positive().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { user } = await resolveScope(ctx);
      const range = deriveDateRangeFromTimeRange(input.timeRange);
      const scope = { userId: user.id };
      const res = await buildAggregatedEquityCurve(scope, {
        startDate: range.startDate,
        endDate: range.endDate,
        maxPoints: input.maxPoints,
        strategyIds: [input.strategyId],
      });
      return { points: res.points.map(p => equityPointSchema.parse(p)) };
    }),
  strategyComparison: protectedProcedure
    .input(
      z.object({
        page: z.number().int().positive().default(1),
        pageSize: z.number().int().positive().default(10),
        sortBy: z
          .enum([
            "totalReturn",
            "totalReturnPct",
            "maxDrawdown",
            "maxDrawdownPct",
            "sharpeRatio",
            "sortinoRatio",
            "cagr",
            "calmar",
            "winRatePct",
            "lossRatePct",
            "totalTrades",
            "profitFactor",
            "expectancy",
            "payoffRatio",
            "strategyId",
            "name",
            "type",
          ] as const)
          .default("totalReturn"),
        sortOrder: z.enum(["asc", "desc"]).default("desc"),
        filterType: z.enum(["all", "swing", "intraday"]).default("all"),
        search: z.string().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        timeRange: timeRangeInput,
      })
    )
    .query(async ({ ctx, input }) => {
      const { user } = await resolveScope(ctx);
      const range = deriveDateRangeFromTimeRange(input.timeRange);
      const scope = { userId: user.id };
      const result = await getStrategyAnalytics({
        userId: scope.userId,
        input: {
          ...input,
          startDate: input.startDate ?? range.startDate,
          endDate: input.endDate ?? range.endDate,
          timeRange: input.timeRange,
        },
      });
      return {
        rows: result.rows.map(row => strategyRowSchema.parse(row)),
        total: result.total,
      };
    }),
  customPortfolio: protectedProcedure
    .input(
      z
        .object({
          strategyIds: z.array(z.number().int()).nonempty().max(50),
          weights: z.array(z.number()).optional(),
          timeRange: timeRangeInput,
          maxPoints: z.number().int().positive().max(2000).optional(),
        })
        .refine(input => !input.weights || input.weights.length === input.strategyIds.length, {
          message: "weights length must match strategyIds",
        }),
    )
    .mutation(async ({ ctx, input }) => {
      const { user } = await resolveScope(ctx);
      const scope = { userId: user.id };

      const result = await getCustomPortfolioAnalytics({
        userId: scope.userId,
        strategyIds: input.strategyIds,
        weights: input.weights,
        timeRange: input.timeRange,
        maxPoints: input.maxPoints,
      });

      return {
        metrics: workspaceMetricsSchema.parse(result.metrics),
        equityCurve: { points: result.equityCurve.points.map(p => equityPointSchema.parse(p)) },
        contributions: result.contributions.map(c => customPortfolioContributionSchema.parse(c)),
      };
    }),
  getEquityCurve: protectedProcedure
    .input(
      z
        .object({
          startDate: z.string().optional(),
          endDate: z.string().optional(),
          timeRange: timeRangeInput,
          maxPoints: z.number().int().min(10).max(5000).optional(),
          strategyId: z.number().int().nullable().optional(),
        })
        .optional(),
    )
    .output(equityCurveResponseSchema)
    .mutation(async ({ ctx, input }) => {
      const { user } = await resolveScope(ctx);
      const scope = { userId: user.id };
      const range = resolveDateRange({
        startDate: input?.startDate,
        endDate: input?.endDate,
        timeRange: input?.timeRange,
      });
      const strategyFilter = input?.strategyId ? [input.strategyId] : undefined;
      const result = await buildAggregatedEquityCurve(scope, {
        startDate: range.startDate,
        endDate: range.endDate,
        maxPoints: input?.maxPoints ?? 1000,
        strategyIds: strategyFilter,
      });

      return equityCurveResponseSchema.parse(result);
    }),
  getPositions: protectedProcedure
    .input(
      z
        .object({
          strategyId: z.number().int().nullable().optional(),
          timeRange: timeRangeInput,
          startDate: z.string().optional(),
          endDate: z.string().optional(),
        })
        .optional(),
    )
    .output(positionsResponseSchema)
    .mutation(async ({ ctx, input }) => {
      const { user } = await resolveScope(ctx);
      const scope = { userId: user.id };
      const range = resolveDateRange({
        startDate: input?.startDate,
        endDate: input?.endDate,
        timeRange: input?.timeRange,
      });
      const strategyFilter = input?.strategyId ? [input.strategyId] : undefined;
      const trades = await loadTrades(scope, {
        startDate: range.startDate,
        endDate: range.endDate,
        strategyIds: strategyFilter,
      });

      return positionsResponseSchema.parse({ positions: buildPositions(trades) });
    }),
  getAnalytics: protectedProcedure
    .input(
      z
        .object({
          startDate: z.string().optional(),
          endDate: z.string().optional(),
          timeRange: timeRangeInput,
          maxPoints: z.number().int().min(10).max(5000).optional(),
          strategyId: z.number().int().nullable().optional(),
        })
        .optional(),
    )
    .output(analyticsPayloadSchema)
    .query(async ({ ctx, input }) => {
      const { user } = await resolveScope(ctx);
      const scope = { userId: user.id };
      const range = resolveDateRange({
        startDate: input?.startDate,
        endDate: input?.endDate,
        timeRange: input?.timeRange,
      });
      const strategyFilter = input?.strategyId ? [input.strategyId] : undefined;
      const [equityCurve, drawdowns, overview] = await Promise.all([
        buildAggregatedEquityCurve(scope, {
          startDate: range.startDate,
          endDate: range.endDate,
          maxPoints: input?.maxPoints ?? 1000,
          strategyIds: strategyFilter,
        }),
        buildDrawdownCurves(scope, {
          startDate: range.startDate,
          endDate: range.endDate,
          maxPoints: input?.maxPoints ?? 1000,
          strategyIds: strategyFilter,
        }),
        buildPortfolioOverview(scope, { startDate: range.startDate, endDate: range.endDate, strategyIds: strategyFilter }),
      ]);

      const metrics = overview.metrics ?? emptyWorkspaceMetrics;
      const dailyReturns = computeDailyReturns(equityCurve.points, ENGINE_CONFIG.initialCapital);

      return analyticsPayloadSchema.parse({
        metrics,
        equityCurve: equityCurve.points,
        drawdowns: drawdowns.points,
        dailyReturns,
        tradeCount: overview.totalTrades,
      });
    }),
  summary: protectedProcedure
    .input(
      z
        .object({
          timeRange: timeRangeInput,
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const { user } = await resolveScope(ctx);
      const scope = { userId: user.id };
      return summarySchema.parse(
        await getPortfolioSummaryMetrics({
          userId: scope.userId,
          timeRange: input?.timeRange,
        }),
      );
    }),
  trades: protectedProcedure
    .input(
      z
        .object({
          timeRange: timeRangeInput,
          page: z.number().int().min(1).default(1),
          pageSize: z.number().int().min(1).max(500).default(50),
          symbol: z.string().trim().min(1).max(24).optional(),
          symbols: z.array(z.string().trim().min(1).max(24)).optional(),
          strategyId: z.number().int().optional(),
          strategyIds: z.array(z.number().int()).optional(),
          side: z.enum(["long", "short"]).optional(),
          outcome: z.enum(["win", "loss"]).optional(),
          startDate: z.string().optional(),
          endDate: z.string().optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const { user } = await resolveScope(ctx);
      const scope = { userId: user.id };
      const page = input?.page ?? 1;
      const pageSize = input?.pageSize ?? 50;
      const result = await getPortfolioTrades({
        userId: scope.userId,
        timeRange: input?.timeRange,
        page,
        pageSize,
        symbol: input?.symbol?.toUpperCase(),
        symbols: input?.symbols?.map(s => s.toUpperCase()),
        side: input?.side,
        strategyId: input?.strategyId,
        strategyIds: input?.strategyIds,
        outcome: input?.outcome,
        startDate: input?.startDate,
        endDate: input?.endDate,
      });
      return {
        rows: result.rows.map(row => tradeRowSchema.parse(row)),
        total: result.total,
        page,
        pageSize,
      };
    }),
  exportTradesCsv: protectedProcedure
    .input(
      z.object({
        strategyIds: z.array(z.number().int()).optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        timeRange: timeRangeInput,
        symbols: z.array(z.string().trim().min(1).max(24)).optional(),
        side: z.enum(["long", "short"]).optional(),
        outcome: z.enum(["win", "loss"]).optional(),
      }),
    )
    .output(exportTradesResponseSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const { user } = await resolveScope(ctx);
        const csvString = await getPortfolioSummaryCsv({
          userId: user.id,
          strategyIds: input.strategyIds,
          startDate: input.startDate,
          endDate: input.endDate,
          timeRange: input.timeRange,
          symbols: input.symbols?.map(s => s.toUpperCase()),
          side: input.side,
          outcome: input.outcome,
        });

        return exportTradesResponseSchema.parse({
          filename: "trades-export.csv",
          mimeType: "text/csv",
          content: csvString,
        });
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to export trades",
        });
      }
    }),
  uploadTradesCsv: protectedProcedure
    .input(
      z.object({
        csv: z.string(),
        fileName: z.string().optional(),
        strategyName: z.string().optional(),
        strategyType: z.enum(["swing", "intraday"]).optional(),
      }),
    )
    .output(tradeIngestionResultSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const { user } = await resolveScope(ctx);
        enforceUploadGuards(input.csv, input.fileName);
        const result = await ingestTradesFromCsv({
          csv: input.csv,
          userId: user.id,
          defaultStrategyName: input.strategyName,
          defaultStrategyType: input.strategyType,
          fileName: input.fileName,
        });
        return tradeIngestionResultSchema.parse({
          importedCount: result.insertedCount,
          skippedCount: result.skippedCount,
          failedCount: result.failedCount,
          errors: result.errors,
          warnings: result.warnings,
          uploadId: result.uploadId,
          headerIssues: undefined,
        });
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: error instanceof Error ? error.message : "Failed to ingest trades",
        });
      }
    }),
  uploadBenchmarksCsv: protectedProcedure
    .input(
      z.object({
        csv: z.string(),
        fileName: z.string().optional(),
        symbol: z.string().optional(),
      }),
    )
    .output(benchmarkIngestionResultSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const { user } = await resolveScope(ctx);
        enforceUploadGuards(input.csv, input.fileName);
        const result = await ingestBenchmarksCsv({
          csv: input.csv,
          userId: user.id,
          fileName: input.fileName,
          defaultSymbol: input.symbol,
        });
        return benchmarkIngestionResultSchema.parse(result);
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: error instanceof Error ? error.message : "Failed to ingest benchmarks",
        });
      }
    }),
  monteCarloSimulation: protectedProcedure
    .input(
      z.object({
        days: z.number().int().min(7).max(365).default(90),
        simulations: z.number().int().min(100).max(5000).default(500),
        timeRange: timeRangeInput,
      })
    )
    .query(async ({ ctx, input }) =>
      monteCarloSchema.parse(
        await (async () => {
          const { user } = await resolveScope(ctx);
          return runMonteCarloSimulation({
            userId: user.id,
            days: input.days,
            simulations: input.simulations,
            ...deriveDateRangeFromTimeRange(input.timeRange),
          });
        })(),
      ),
    ),
});

function buildPositions(trades: TradeRow[]) {
  const grouped = new Map<
    string,
    {
      symbol: string;
      strategyId: number | null;
      totalQty: number;
      totalAbsQty: number;
      entryNotional: number;
      realizedPnl: number;
      lastPrice: number;
      lastTradeAt: string;
    }
  >();

  for (const trade of trades) {
    const key = `${trade.strategyId ?? ""}::${trade.symbol}`;
    const qty = Number(trade.quantity) || 0;
    const entryPrice = Number(trade.entryPrice) || 0;
    const exitPrice = Number(trade.exitPrice) || 0;
    const signedQty = trade.side.toLowerCase() === "short" ? -qty : qty;
    const pnl = tradePnl(trade.side, entryPrice, exitPrice, qty);

    const existing = grouped.get(key) ?? {
      symbol: trade.symbol,
      strategyId: trade.strategyId ?? null,
      totalQty: 0,
      totalAbsQty: 0,
      entryNotional: 0,
      realizedPnl: 0,
      lastPrice: exitPrice,
      lastTradeAt: trade.exitTime,
    };

    existing.totalQty += signedQty;
    existing.totalAbsQty += Math.abs(qty);
    existing.entryNotional += Math.abs(qty) * entryPrice;
    existing.realizedPnl += pnl;
    existing.lastPrice = exitPrice;
    existing.lastTradeAt = trade.exitTime;

    grouped.set(key, existing);
  }

  return Array.from(grouped.values())
    .map(position => {
      const avgEntry = position.totalAbsQty > 0 ? position.entryNotional / position.totalAbsQty : 0;
      const side = position.totalQty > 0 ? "long" : position.totalQty < 0 ? "short" : "flat";
      const marketValue = position.lastPrice * position.totalQty;

      return positionSchema.parse({
        symbol: position.symbol,
        strategyId: position.strategyId,
        side,
        quantity: position.totalQty,
        avgEntry,
        marketValue,
        unrealizedPnl: 0,
        realizedPnl: position.realizedPnl,
        lastTradeAt: position.lastTradeAt,
        status: position.totalQty === 0 ? "closed" : "open",
      });
    })
    .sort((a, b) => b.lastTradeAt.localeCompare(a.lastTradeAt));
}
