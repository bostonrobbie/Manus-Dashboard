import mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';

dotenv.config();

async function findMaxDrawdown() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);

  // Get all trades ordered by exit time
  const [trades] = await connection.query(`
    SELECT pnl_cents, exit_time 
    FROM trades 
    ORDER BY exit_time ASC
  `);

  console.log(`Total trades: ${trades.length}`);

  // Calculate equity curve
  let equity = 100000; // Starting capital in dollars
  const equityCurve = [];

  for (const trade of trades) {
    equity += trade.pnl_cents / 100; // Convert cents to dollars
    equityCurve.push({
      date: trade.exit_time,
      equity: equity
    });
  }

  // Find max drawdown in dollars
  let maxEquity = equityCurve[0].equity;
  let maxDrawdownDollars = 0;
  let maxDrawdownDate = '';
  let peakDate = '';
  let troughEquity = 0;

  for (const point of equityCurve) {
    if (point.equity > maxEquity) {
      maxEquity = point.equity;
      peakDate = point.date;
    }

    const drawdown = maxEquity - point.equity;
    if (drawdown > maxDrawdownDollars) {
      maxDrawdownDollars = drawdown;
      maxDrawdownDate = point.date;
      troughEquity = point.equity;
    }
  }

  console.log(`\nLargest Drawdown:`);
  console.log(`Peak: $${maxEquity.toFixed(2)} on ${peakDate}`);
  console.log(`Trough: $${troughEquity.toFixed(2)} on ${maxDrawdownDate}`);
  console.log(`Drawdown: $${maxDrawdownDollars.toFixed(2)}`);
  console.log(`Percentage: ${((maxDrawdownDollars / maxEquity) * 100).toFixed(2)}%`);

  await connection.end();
  process.exit(0);
}

findMaxDrawdown().catch(console.error);
