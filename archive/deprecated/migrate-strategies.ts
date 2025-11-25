/**
 * Migration Script: Classify Strategies and Set Initial Capital
 * 
 * This script:
 * 1. Classifies each strategy as swing or intraday based on holding period
 * 2. Sets contractSize (all mini for now)
 * 3. Sets initialCapital ($100k for mini contracts)
 */

import { getDb } from '../db';
import { strategies, trades } from '../../drizzle/schema';
import { eq } from 'drizzle-orm';

async function migrateStrategies() {
  const db = await getDb();
  if (!db) {
    console.error('Failed to connect to database');
    process.exit(1);
  }

  console.log('Starting strategy migration...\n');

  // Get all strategies
  const allStrategies = await db.select().from(strategies);
  console.log(`Found ${allStrategies.length} strategies to migrate\n`);

  for (const strategy of allStrategies) {
    console.log(`Processing strategy: ${strategy.name} (ID: ${strategy.id})`);

    // Get all closed trades for this strategy
    const strategyTrades = await db.select()
      .from(trades)
      .where(eq(trades.strategyId, strategy.id));

    const closedTrades = strategyTrades.filter(t => t.exitTime && t.entryTime);

    if (closedTrades.length === 0) {
      console.log(`  No closed trades found, skipping classification`);
      continue;
    }

    // Calculate holding periods
    const holdingPeriods = closedTrades.map(t => {
      const entry = new Date(t.entryTime);
      const exit = new Date(t.exitTime!);
      const entryDate = entry.toISOString().split('T')[0];
      const exitDate = exit.toISOString().split('T')[0];
      return entryDate === exitDate; // true if same day
    });

    // Calculate percentage of same-day trades
    const sameDayCount = holdingPeriods.filter(Boolean).length;
    const sameDayPercent = (sameDayCount / holdingPeriods.length) * 100;

    // Classify as intraday if >= 90% of trades are same-day
    const strategyType = sameDayPercent >= 90 ? 'intraday' : 'swing';

    console.log(`  Closed trades: ${closedTrades.length}`);
    console.log(`  Same-day trades: ${sameDayCount} (${sameDayPercent.toFixed(1)}%)`);
    console.log(`  Classification: ${strategyType}`);

    // Update strategy
    await db.update(strategies)
      .set({
        type: strategyType,
        contractSize: 'mini', // All are mini contracts
        initialCapital: 100000, // $100k for mini
      })
      .where(eq(strategies.id, strategy.id));

    console.log(`  ✓ Updated\n`);
  }

  console.log('Migration complete!');
  process.exit(0);
}

migrateStrategies().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
