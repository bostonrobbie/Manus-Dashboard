import { drizzle, type MySql2Database } from "drizzle-orm/mysql2";
import mysql from "mysql2";
import type { Pool } from "mysql2/promise";
import { env } from "@server/utils/env";
import * as schema from "@drizzle/schema";

export type Database = MySql2Database<typeof schema>;

let db: Database | null = null;

export async function getDb(): Promise<Database | null> {
  if (db) return db;
  if (!env.databaseUrl) return null;

  const pool: Pool = mysql.createPool(env.databaseUrl).promise();
  db = drizzle(pool, { schema, mode: "default" });
  return db;
}

export { schema };
