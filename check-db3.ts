import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { sql } from "drizzle-orm";

async function checkDb() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL!);
  const db = drizzle(connection);

  // Check date range with correct column name
  const dateRange = await db.execute(
    sql`SELECT MIN(exitDate) as min_date, MAX(exitDate) as max_date FROM trades`
  );
  console.log("Date range:", dateRange[0]);

  // Check source distribution
  const sources = await db.execute(
    sql`SELECT source, COUNT(*) as count FROM trades GROUP BY source`
  );
  console.log("Sources:", sources[0]);

  await connection.end();
  process.exit(0);
}

checkDb().catch(e => {
  console.error(e);
  process.exit(1);
});
