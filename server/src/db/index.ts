import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { env } from "@server/utils/env";
import * as schema from "@drizzle/schema";

export type Database = ReturnType<typeof drizzle>;

let db: Database | null = null;

export async function getDb(): Promise<Database | null> {
  if (db) return db;
  if (!env.databaseUrl) return null;

  const pool = new Pool({ connectionString: env.databaseUrl });
  db = drizzle(pool, { schema });
  return db;
}

export { schema };
