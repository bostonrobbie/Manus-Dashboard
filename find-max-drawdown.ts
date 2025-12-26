import { db } from './server/db';
import { calculateEquityCurve } from './server/analytics';

async function findMaxDrawdown() {
  // Get all trades
  const trades = await db.query.trades.findMany({
    orderBy: (trades, { asc }) => [asc(trades.exitTime)],
  });

  console.log(`Total trades: ${trades.length}`);

  // Calculate equity curve
  const equityCurve = calculateEquityCurve(trades, 100000);

  // Find max drawdown in dollars
  let maxEquity = equityCurve[0].equity;
  let maxDrawdownDollars = 0;
  let maxDrawdownDate = '';
  let peakDate = '';

  for (const point of equityCurve) {
    if (point.equity > maxEquity) {
      maxEquity = point.equity;
      peakDate = point.date;
    }

    const drawdown = maxEquity - point.equity;
    if (drawdown > maxDrawdownDollars) {
      maxDrawdownDollars = drawdown;
      maxDrawdownDate = point.date;
    }
  }

  console.log(`\nLargest Drawdown:`);
  console.log(`Peak: $${maxEquity.toFixed(2)} on ${peakDate}`);
  console.log(`Trough: $${(maxEquity - maxDrawdownDollars).toFixed(2)} on ${maxDrawdownDate}`);
  console.log(`Drawdown: $${maxDrawdownDollars.toFixed(2)}`);
  console.log(`Percentage: ${((maxDrawdownDollars / maxEquity) * 100).toFixed(2)}%`);

  process.exit(0);
}

findMaxDrawdown().catch(console.error);
