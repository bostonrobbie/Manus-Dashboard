import "../src/utils/env";

import {
  buildAggregatedEquityCurve,
  buildPortfolioOverview,
  buildStrategyComparison,
  runMonteCarloSimulation,
} from "@server/engine/portfolio-engine";
import { deriveDateRangeFromTimeRange } from "@server/utils/timeRange";

function assertFinite(name: string, value: number): void {
  if (!Number.isFinite(value)) {
    throw new Error(`${name} is not finite`);
  }
}

async function main() {
  const userId = Number(process.env.USER_ID ?? 1);

  console.log(`Running portfolio smoke test for user ${userId}...`);

  const overview = await buildPortfolioOverview(userId);
  assertFinite("equity", overview.equity);
  assertFinite("sharpeRatio", overview.sharpeRatio);
  assertFinite("maxDrawdown", overview.maxDrawdown);
  console.log(
    `Overview: equity=${overview.equity.toFixed(2)}, sharpe=${overview.sharpeRatio.toFixed(2)}, maxDrawdown=${overview.maxDrawdown.toFixed(2)}`,
  );

  const equityCurve = await buildAggregatedEquityCurve(userId, {});
  console.log(`Aggregated equity curve points: ${equityCurve.points.length}`);

  const threeMonthRange = deriveDateRangeFromTimeRange({ preset: "3M" });
  const equityCurve3M = await buildAggregatedEquityCurve(userId, threeMonthRange);
  console.log(
    `3M equity curve points: ${equityCurve3M.points.length} (start=${threeMonthRange.startDate ?? "n/a"}, end=${
      threeMonthRange.endDate ?? "n/a"
    })`,
  );
  if (equityCurve3M.points.length > equityCurve.points.length) {
    throw new Error("3M equity curve should not have more points than full history");
  }

  const strategyComparison = await buildStrategyComparison({
    userId,
    page: 1,
    pageSize: 50,
    sortBy: "totalReturn",
    sortOrder: "desc",
    filterType: "all",
  });
  console.log(`Strategies compared: ${strategyComparison.rows.length}`);

  const mcResult = await runMonteCarloSimulation({ userId, days: 60, simulations: 500 });
  const finalEquitiesSorted = [...mcResult.finalEquities].sort((a, b) => a - b);
  const medianEquity = finalEquitiesSorted[Math.floor(finalEquitiesSorted.length / 2)] ?? mcResult.currentEquity;
  assertFinite("medianMonteCarloEquity", medianEquity);
  assertFinite("currentEquity", mcResult.currentEquity);

  console.log(
    `Monte Carlo: points=${mcResult.futureDates.length}, currentEquity=${mcResult.currentEquity.toFixed(2)}, medianFinal=${medianEquity.toFixed(2)}`,
  );

  if (!Number.isFinite(medianEquity) || !Number.isFinite(mcResult.currentEquity)) {
    throw new Error("Monte Carlo returned invalid numbers");
  }

  console.log("Smoke test completed successfully.");
}

main().catch(err => {
  console.error("Smoke test failed", err);
  process.exit(1);
});
