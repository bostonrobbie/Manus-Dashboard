import { drizzle, type MySql2Database } from "drizzle-orm/mysql2";
import mysql, { type Pool } from "mysql2/promise";
import { env } from "@server/utils/env";
import * as schema from "@drizzle/schema";

export type Database = MySql2Database<typeof schema>;

let db: Database | null = null;
let pool: Pool | null = null;
let getDbOverride: (() => Promise<Database | null>) | null = null;

const getPool = (): Pool | null => {
  if (pool) return pool;
  if (process.env.NODE_ENV === "test" && process.env.USE_REAL_DB !== "true") {
    return null;
  }
  if (!env.databaseUrl) return null;

  pool = mysql.createPool({
    uri: env.databaseUrl,
  });

  return pool;
};

export async function pingDatabaseOnce(): Promise<void> {
  const poolInstance = getPool();
  if (!poolInstance) {
    throw new Error("Database URL not configured");
  }

  const connection = await poolInstance.getConnection();
  try {
    await connection.query("SELECT 1");
  } finally {
    connection.release();
  }
}

export async function getDb(): Promise<Database | null> {
  if (getDbOverride) return getDbOverride();
  if (db) return db;
  const poolInstance = getPool();
  if (!poolInstance) return null;

  db = drizzle(poolInstance, { schema, mode: "default" });
  return db;
}

export function setTestDb(mockDb: Database | null) {
  db = mockDb;
  getDbOverride = mockDb ? async () => mockDb : null;
  pool = null;
}

export function setGetDbOverride(fn: (() => Promise<Database | null>) | null) {
  getDbOverride = fn;
  if (!fn) {
    db = null;
    pool = null;
  }
}

export { schema, db };
