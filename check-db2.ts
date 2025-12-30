import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { sql } from "drizzle-orm";

async function checkDb() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL!);
  const db = drizzle(connection);

  // Check column names
  const columns = await db.execute(sql`DESCRIBE trades`);
  console.log("Columns:", columns[0]);

  await connection.end();
  process.exit(0);
}

checkDb().catch(e => {
  console.error(e);
  process.exit(1);
});
