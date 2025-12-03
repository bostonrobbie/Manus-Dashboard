/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { drizzle } from "drizzle-orm/mysql2";
import { createPool } from "mysql2/promise";
import { env } from "@server/utils/env";
import * as schema from "@drizzle/schema";

export type Database = ReturnType<typeof drizzle>;

let db: Database | null = null;

export async function getDb(): Promise<Database | null> {
  if (db) return db;
  if (!env.databaseUrl) return null;

  const pool = createPool(env.databaseUrl);
  db = drizzle(pool, { schema });
  return db;
}

export { schema };
