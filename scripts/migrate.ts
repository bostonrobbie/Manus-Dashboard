import { migrate } from "drizzle-orm/node-postgres/migrator";
import { getDb } from "@server/db";

async function main() {
  const db = await getDb();
  if (!db) {
    console.log("Database url not provided; skipping migrations.");
    return;
  }
  await migrate(db, { migrationsFolder: "./drizzle/migrations" });
  console.log("Migrations completed");
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
