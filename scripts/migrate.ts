import { migrate } from "drizzle-orm/node-postgres/migrator";
import { drizzle } from "drizzle-orm/node-postgres";
import dotenv from "dotenv";
import { Pool } from "pg";
import path from "node:path";
import { fileURLToPath } from "node:url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required to run migrations");
  }

  const pool = new Pool({ connectionString: databaseUrl });
  const db = drizzle(pool);

  await migrate(db, {
    migrationsFolder: path.resolve(__dirname, "../drizzle/migrations"),
  });

  await pool.end();
  console.log("Migrations completed");
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
