import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { benchmarks } from './drizzle/schema.ts';
import { sql } from 'drizzle-orm';

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(connection);

// Get date range
const result = await db.execute(sql`
  SELECT 
    MIN(DATE(date)) as earliest_date,
    MAX(DATE(date)) as latest_date,
    COUNT(*) as total_records
  FROM benchmarks
`);

console.log('S&P 500 Benchmark Data Coverage:');
console.log(result[0]);

// Check for gaps in recent data (last 30 days)
const recent = await db.execute(sql`
  SELECT DATE(date) as trading_date
  FROM benchmarks
  WHERE date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
  ORDER BY date DESC
`);

console.log('\nRecent 30 days:');
console.log(recent[0]);

await connection.end();
