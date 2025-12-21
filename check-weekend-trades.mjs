import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { sql } from 'drizzle-orm';

const connection = await mysql.createConnection({
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '4000'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'test',
});

const db = drizzle(connection);

// Check trades by day of week
const result = await db.execute(sql`
  SELECT 
    DAYNAME(exitDate) as day_of_week,
    DAYOFWEEK(exitDate) as day_num,
    COUNT(*) as trade_count,
    SUM(pnl) / 100 as total_pnl_dollars
  FROM trades
  GROUP BY DAYNAME(exitDate), DAYOFWEEK(exitDate)
  ORDER BY DAYOFWEEK(exitDate)
`);

console.log('Trades by Day of Week (based on exitDate):');
console.table(result[0]);

// Check for specific Sunday trades
const sundayTrades = await db.execute(sql`
  SELECT id, strategyId, exitDate, pnl/100 as pnl_dollars
  FROM trades
  WHERE DAYOFWEEK(exitDate) = 1
  LIMIT 10
`);

console.log('\nSample Sunday trades (if any):');
console.table(sundayTrades[0]);

// Check for Saturday trades
const saturdayTrades = await db.execute(sql`
  SELECT id, strategyId, exitDate, pnl/100 as pnl_dollars
  FROM trades
  WHERE DAYOFWEEK(exitDate) = 7
  LIMIT 10
`);

console.log('\nSample Saturday trades (if any):');
console.table(saturdayTrades[0]);

await connection.end();
