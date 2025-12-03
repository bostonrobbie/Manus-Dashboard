import { performance } from "node:perf_hooks";

import { buildPortfolioOverview, buildPortfolioSummary, loadTrades } from "@server/portfolio-engine";
import { getDb } from "@server/db";
import { ingestBenchmarksCsv } from "@server/services/benchmarkIngestion";
import { ingestTradesCsv } from "@server/services/tradeIngestion";
import { createLogger } from "@server/utils/logger";

const logger = createLogger("load-large-dataset");

function generateTradesCsv(count: number): string {
  const rows = [
    "symbol,side,quantity,entryPrice,exitPrice,entryTime,exitTime,strategy",
  ];
  const start = new Date("2023-01-01T00:00:00Z").getTime();
  for (let i = 0; i < count; i++) {
    const entry = new Date(start + i * 86_400_000);
    const exit = new Date(entry.getTime() + 86_400_000);
    const side = i % 2 === 0 ? "long" : "short";
    const symbol = i % 5 === 0 ? "SPY" : "AAPL";
    const qty = (i % 10) + 1;
    const entryPrice = 100 + (i % 50);
    const exitPrice = side === "long" ? entryPrice + 2 : entryPrice - 2;
    rows.push(
      `${symbol},${side},${qty},${entryPrice.toFixed(2)},${exitPrice.toFixed(2)},${entry.toISOString()},${exit.toISOString()},LoadTest`,
    );
  }
  return rows.join("\n");
}

function generateBenchmarksCsv(days: number): string {
  const rows = ["symbol,date,close"];
  const start = new Date("2023-01-01T00:00:00Z");
  for (let i = 0; i < days; i++) {
    const date = new Date(start.getTime() + i * 86_400_000);
    rows.push(`SPY,${date.toISOString().slice(0, 10)},${400 + i * 0.1}`);
  }
  return rows.join("\n");
}

async function runTimings(scope: { userId: number }) {
  const timings: Record<string, number> = {};
  const mark = async (label: string, fn: () => Promise<unknown>) => {
    const start = performance.now();
    await fn();
    timings[label] = performance.now() - start;
  };

  await mark("portfolioOverview", () => buildPortfolioOverview(scope, {}));
  await mark("portfolioSummary", () => buildPortfolioSummary(scope, {}));
  await mark("loadTradesPage1", () => loadTrades(scope, { startDate: "2023-01-01", endDate: "2023-12-31" }));

  logger.info("Load test timings", { eventName: "LOAD_DATASET_TIMINGS", ...timings, userId: scope.userId });
}

async function main() {
  const userId = Number(process.env.USER_ID ?? 1);
  const tradesToGenerate = Number(process.env.LOAD_TRADE_COUNT ?? 100_000);

  logger.info("Beginning load test dataset generation", {
    eventName: "LOAD_DATASET_START",
    userId,
    tradesToGenerate,
  });

  const tradesCsv = generateTradesCsv(tradesToGenerate);
  const benchmarksCsv = generateBenchmarksCsv(365);

  const tradeResult = await ingestTradesCsv({
    csv: tradesCsv,
    userId,
    fileName: "load-test-trades.csv",
    defaultStrategyName: "LoadTest",
    defaultStrategyType: "swing",
  });
  logger.info("Trades ingestion complete", {
    eventName: "LOAD_DATASET_TRADES",
    imported: tradeResult.importedCount,
    failed: tradeResult.failedCount,
    warnings: tradeResult.warnings.slice(0, 3),
  });

  const benchResult = await ingestBenchmarksCsv({
    csv: benchmarksCsv,
    userId,
    fileName: "load-test-benchmarks.csv",
  });
  logger.info("Benchmarks ingestion complete", {
    eventName: "LOAD_DATASET_BENCHMARKS",
    imported: benchResult.importedCount,
    failed: benchResult.failedCount,
  });

  if (!await getDb()) throw new Error("Database not configured");

  await runTimings({ userId });

  logger.info("Load test dataset finished", {
    eventName: "LOAD_DATASET_END",
    userId,
  });
}

main().catch(error => {
  logger.error("Load test dataset failed", { eventName: "LOAD_DATASET_FAILED", message: (error as Error).message });
  process.exit(1);
});
