import { eq } from "drizzle-orm";

import { getDb, schema } from "@server/db";
import { createLogger } from "@server/utils/logger";
import { ingestTradesCsv } from "@server/services/tradeIngestion";

import { parseCsvRecords, readSeedFile, resolveSeedUserId } from "./seedUtils";

const logger = createLogger("seed-trades");

export function parseTradesCsv(csv: string): number {
  const { records } = parseCsvRecords(csv);
  return records.length;
}

export async function seedTradesFromCsv() {
  const db = await getDb();
  if (!db) throw new Error("DATABASE_URL is required to seed trades");

  const csv = readSeedFile("trades.csv");
  const totalRows = parseTradesCsv(csv);
  const userId = resolveSeedUserId();

  logger.info("Seeding trades from CSV", { rows: totalRows, userId });

  await db.delete(schema.trades).where(eq(schema.trades.userId, userId));

  const result = await ingestTradesCsv({
    csv,
    userId,
    defaultStrategyName: "Imported",
    defaultStrategyType: "intraday",
    fileName: "trades.csv",
  });

  logger.info("Finished seeding trades", {
    inserted: result.importedCount,
    skipped: result.skippedCount,
    failed: result.failedCount,
    warnings: result.warnings.slice(0, 3),
    userId,
  });

  if (result.failedCount > 0 && result.importedCount === 0) {
    throw new Error(`Trade seed failed: ${result.errors.join("; ")}`);
  }
}

if (require.main === module) {
  seedTradesFromCsv()
    .then(() => logger.info("Trades seed complete"))
    .catch(error => {
      logger.error("Failed to seed trades", { message: (error as Error).message });
      process.exit(1);
    });
}
