import {
  calculateDailyEquityCurve,
  calculateDailySharpeRatio,
  calculateDailySortinoRatio,
} from "./server/core/dailyEquityCurve";
import * as db from "./server/db";

async function testRatios() {
  // Get trades for 1Y period
  const now = new Date();
  const startDate = new Date(now);
  startDate.setFullYear(now.getFullYear() - 1);

  const strategies = await db.getAllStrategies();
  const strategyIds = strategies.map(s => s.id);

  // Use csv_import source instead of backtest
  const trades = await db.getTrades({
    strategyIds,
    startDate,
    endDate: now,
    source: "csv_import",
  });

  console.log(`Total trades in 1Y: ${trades.length}`);

  if (trades.length === 0) {
    console.log("No trades found!");
    process.exit(0);
  }

  // Calculate with $25k starting capital
  const result = calculateDailyEquityCurve(trades, 25000);

  console.log(`Trading days: ${result.tradingDays}`);
  console.log(`Total return: ${(result.totalReturn * 100).toFixed(2)}%`);

  // Stats
  const mean =
    result.dailyReturns.reduce((s, r) => s + r, 0) / result.dailyReturns.length;
  const variance =
    result.dailyReturns.reduce((s, r) => s + Math.pow(r - mean, 2), 0) /
    (result.dailyReturns.length - 1);
  const stdDev = Math.sqrt(variance);

  console.log(`Mean daily return: ${(mean * 100).toFixed(4)}%`);
  console.log(`StdDev daily return: ${(stdDev * 100).toFixed(4)}%`);
  console.log(
    `Annualized Sharpe (manual): ${((mean / stdDev) * Math.sqrt(252)).toFixed(2)}`
  );

  const sharpe = calculateDailySharpeRatio(result.dailyReturns);
  const sortino = calculateDailySortinoRatio(result.dailyReturns);

  console.log(`Sharpe (function): ${sharpe}`);
  console.log(`Sortino (function): ${sortino}`);

  // Check for extreme values
  const maxReturn = Math.max(...result.dailyReturns);
  const minReturn = Math.min(...result.dailyReturns);
  console.log(`Max daily return: ${(maxReturn * 100).toFixed(2)}%`);
  console.log(`Min daily return: ${(minReturn * 100).toFixed(2)}%`);

  // Count extreme days
  const extremeDays = result.dailyReturns.filter(r => Math.abs(r) > 0.1).length;
  console.log(`Days with >10% move: ${extremeDays}`);

  // Now test with $100k starting capital
  console.log("\n--- With $100k starting capital ---");
  const result100k = calculateDailyEquityCurve(trades, 100000);
  const mean100k =
    result100k.dailyReturns.reduce((s, r) => s + r, 0) /
    result100k.dailyReturns.length;
  const variance100k =
    result100k.dailyReturns.reduce((s, r) => s + Math.pow(r - mean100k, 2), 0) /
    (result100k.dailyReturns.length - 1);
  const stdDev100k = Math.sqrt(variance100k);

  console.log(`Mean daily return: ${(mean100k * 100).toFixed(4)}%`);
  console.log(`StdDev daily return: ${(stdDev100k * 100).toFixed(4)}%`);
  const sharpe100k = calculateDailySharpeRatio(result100k.dailyReturns);
  const sortino100k = calculateDailySortinoRatio(result100k.dailyReturns);
  console.log(`Sharpe (function): ${sharpe100k}`);
  console.log(`Sortino (function): ${sortino100k}`);

  process.exit(0);
}

testRatios().catch(e => {
  console.error(e);
  process.exit(1);
});
