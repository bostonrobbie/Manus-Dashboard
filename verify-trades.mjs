import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { strategies, trades } from './drizzle/schema.ts';
import { eq, count } from 'drizzle-orm';

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(connection);

const allStrategies = await db.select().from(strategies);

console.log('\n📊 Trade Counts by Strategy:\n');
console.log('Symbol'.padEnd(12), 'Name'.padEnd(35), 'Trades');
console.log('─'.repeat(60));

for (const strategy of allStrategies.sort((a, b) => a.symbol.localeCompare(b.symbol))) {
  const result = await db
    .select({ count: count() })
    .from(trades)
    .where(eq(trades.strategyId, strategy.id));
  
  const tradeCount = result[0]?.count || 0;
  console.log(
    strategy.symbol.padEnd(12),
    strategy.name.padEnd(35),
    tradeCount.toString().padStart(6)
  );
}

await connection.end();
