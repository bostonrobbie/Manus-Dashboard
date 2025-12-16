import { db } from './server/db';
import { sql } from 'drizzle-orm';

async function main() {
  const result = await db.execute(sql`
    SELECT 
      s.id, s.symbol, s.name, 
      MIN(t.entryDate) as first_trade, 
      MAX(t.exitDate) as last_trade, 
      COUNT(*) as trade_count 
    FROM strategies s 
    JOIN trades t ON t.strategyId = s.id 
    GROUP BY s.id, s.symbol, s.name 
    ORDER BY first_trade
  `);
  
  console.log('Strategy Trade Date Ranges:');
  console.log(JSON.stringify(result[0], null, 2));
  process.exit(0);
}

main();
