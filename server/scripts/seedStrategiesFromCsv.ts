import { eq } from "drizzle-orm";
import { z } from "zod";

import { getDb, schema } from "@server/db";
import { createLogger } from "@server/utils/logger";

import { parseCsvRecords, readSeedFile, resolveSeedUserId, type CsvRecord } from "./seedUtils";

const logger = createLogger("seed-strategies");

export interface StrategySeedRow {
  id?: number;
  name: string;
  description?: string;
  symbol: string;
  type: "swing" | "intraday";
}

const strategyRowSchema = z.object({
  id: z.coerce.number().int().optional(),
  name: z.string().min(1),
  description: z.string().optional(),
  symbol: z.string().min(1).default("SPY"),
  type: z.enum(["swing", "intraday"]).default("intraday"),
});

export function parseStrategiesCsv(csv: string): StrategySeedRow[] {
  const { records } = parseCsvRecords(csv);
  return records.map((record, idx) => normalizeStrategyRecord(record, idx + 2));
}

function normalizeStrategyRecord(record: CsvRecord, rowNumber: number): StrategySeedRow {
  const parsed = strategyRowSchema.safeParse({
    id: record["id"] ?? record["strategyid"],
    name: record["name"] ?? record["strategy"] ?? record["strategyname"],
    description: record["description"] ?? record["notes"],
    symbol: record["symbol"] ?? record["ticker"] ?? "SPY",
    type: record["type"] ?? record["strategytype"] ?? "intraday",
  });

  if (!parsed.success) {
    const message = parsed.error.issues.map(issue => issue.message).join("; ");
    throw new Error(`Invalid strategy row ${rowNumber}: ${message}`);
  }

  return parsed.data;
}

export async function seedStrategiesFromCsv() {
  const db = await getDb();
  if (!db) throw new Error("DATABASE_URL is required to seed strategies");

  const userId = resolveSeedUserId();
  const csv = readSeedFile("strategies.csv");
  const strategies = parseStrategiesCsv(csv);

  logger.info("Seeding strategies from CSV", { count: strategies.length, userId });

  await db.delete(schema.strategies).where(eq(schema.strategies.userId, userId));

  if (strategies.length > 0) {
    await db.insert(schema.strategies).values(
      strategies.map(strategy => ({
        id: strategy.id,
        userId,
        name: strategy.name,
        description: strategy.description ?? null,
        symbol: strategy.symbol,
        type: strategy.type,
      })),
    );
  }

  logger.info("Finished seeding strategies", { inserted: strategies.length, userId });
}

if (require.main === module) {
  seedStrategiesFromCsv()
    .then(() => logger.info("Strategies seed complete"))
    .catch(error => {
      logger.error("Failed to seed strategies", { message: (error as Error).message });
      process.exit(1);
    });
}
