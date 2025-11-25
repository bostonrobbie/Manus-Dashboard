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

  const dates = result
    .filter(t => t.exitTime)
    .map(t => t.exitTime!)
    .sort((a, b) => a.getTime() - b.getTime());

  console.log('Total trades:', result.length);
  console.log('Trades with exitTime:', dates.length);
  console.log('\nFirst 5 exit dates:');
  dates.slice(0, 5).forEach(d => console.log('  ', d.toISOString()));
  console.log('\nLast 5 exit dates:');
  dates.slice(-5).forEach(d => console.log('  ', d.toISOString()));
  
  console.log('\nTrades by year:');
  const byYear = new Map<number, number>();
  dates.forEach(d => {
    const year = d.getFullYear();
    byYear.set(year, (byYear.get(year) || 0) + 1);
  });
  
  Array.from(byYear.entries())
    .sort((a, b) => a[0] - b[0])
    .forEach(([year, count]) => {
      console.log(`  ${year}: ${count} trades`);
    });

  // Check for suspicious future dates
  const now = new Date();
  const futureTrades = dates.filter(d => d > now);
  console.log(`\nTrades with future exit dates: ${futureTrades.length}`);
  if (futureTrades.length > 0) {
    console.log('Future trade dates:');
    futureTrades.forEach(d => console.log('  ', d.toISOString()));
  }

  process.exit(0);
}

main().catch(console.error);
