import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { sql } from "drizzle-orm";

async function checkDb() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL!);
  const db = drizzle(connection);

  // Check trades count
  const result = await db.execute(sql`SELECT COUNT(*) as count FROM trades`);
  console.log("Trades count:", result[0]);

  // Check date range
  const dateRange = await db.execute(
    sql`SELECT MIN(exit_date) as min_date, MAX(exit_date) as max_date FROM trades`
  );
  console.log("Date range:", dateRange[0]);

  await connection.end();
  process.exit(0);
}

checkDb().catch(e => {
  console.error(e);
  process.exit(1);
});
