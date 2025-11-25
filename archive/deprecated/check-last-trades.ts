import { getDb } from '../server/db';
import { trades } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

async function main() {
  const db = await getDb();
  if (!db) {
    console.error('Failed to connect to database');
    process.exit(1);
  }

  const result = await db.select()
    .from(trades)
    .where(eq(trades.userId, 1));

  const sorted = result
    .filter(t => t.exitTime)
    .sort((a, b) => a.exitTime!.getTime() - b.exitTime!.getTime());

  console.log('Last 20 trades:');
  console.log('================');
  
  sorted.slice(-20).forEach(t => {
    const pnl = parseFloat(t.pnl || '0');
    console.log(`${t.exitTime!.toISOString().split('T')[0]} | ${t.symbol.padEnd(4)} | ${t.side.padEnd(5)} | PnL: $${pnl.toFixed(2).padStart(10)} | Strategy: ${t.strategyId}`);
  });

  // Calculate cumulative PnL for last 10 days
  const lastTrades = sorted.slice(-50);
  const pnlByDate = new Map<string, number>();
  
  lastTrades.forEach(t => {
    const date = t.exitTime!.toISOString().split('T')[0];
    const pnl = parseFloat(t.pnl || '0');
    pnlByDate.set(date, (pnlByDate.get(date) || 0) + pnl);
  });

  console.log('\n\nPnL by date (last 50 trades):');
  console.log('==============================');
  Array.from(pnlByDate.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .forEach(([date, pnl]) => {
      console.log(`${date} | $${pnl.toFixed(2)}`);
    });

  process.exit(0);
}

main().catch(console.error);
