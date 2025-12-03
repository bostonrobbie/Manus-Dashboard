import { sql } from "drizzle-orm";

import { getDb, schema } from "@server/db";
import { createLogger } from "@server/utils/logger";

const logger = createLogger("duplicate-scan");

async function main() {
  const db = await getDb();
  if (!db) {
    logger.error("Database connection is not configured");
    process.exit(1);
  }

  const rows = await db
    .select({
      userId: schema.trades.userId,
      symbol: schema.trades.symbol,
      side: schema.trades.side,
      quantity: schema.trades.quantity,
      entryTime: schema.trades.entryTime,
      exitTime: schema.trades.exitTime,
      count: sql<number>`count(*)`,
      minId: sql<number>`min(${schema.trades.id})`,
    })
    .from(schema.trades)
    .groupBy(schema.trades.userId, schema.trades.symbol, schema.trades.side, schema.trades.quantity, schema.trades.entryTime, schema.trades.exitTime)
    .having(sql`count(*) > 1`)
    .orderBy(schema.trades.userId, schema.trades.symbol, schema.trades.entryTime)
    .limit(2000);

  if (!rows.length) {
    logger.info("No potential duplicates detected");
    return;
  }

  logger.warn(`Found ${rows.length} potential duplicate groups`);
  for (const row of rows) {
    logger.warn(
      "Duplicate trade group",
      {
        userId: row.userId,
        symbol: row.symbol,
        side: row.side,
        quantity: row.quantity,
        entryTime: row.entryTime,
        exitTime: row.exitTime,
        count: row.count,
        minId: row.minId,
      },
    );
  }
}

main().catch(error => {
  logger.error("Duplicate scan failed", { error });
  process.exit(1);
});
