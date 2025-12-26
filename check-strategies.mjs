import { getDb } from './server/db.ts';

const db = await getDb();
if (!db) {
  console.log('Database not available');
  process.exit(1);
}

const strategies = await db.select().from((await import('./drizzle/schema.ts')).strategies);

console.log('Strategies in database:');
for (const strategy of strategies) {
  console.log(`  ID: ${strategy.id}, Name: ${strategy.name}, Symbol: ${strategy.symbol}, Ratio: ${strategy.microToMiniRatio}`);
}

process.exit(0);
