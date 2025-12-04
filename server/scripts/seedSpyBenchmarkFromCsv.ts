import { eq } from "drizzle-orm";
import { z } from "zod";

import { getDb, schema } from "@server/db";
import { createLogger } from "@server/utils/logger";

import { parseCsvRecords, readSeedFile, resolveSeedUserId, type CsvRecord } from "./seedUtils";

const logger = createLogger("seed-benchmarks");

export interface BenchmarkSeedRow {
  symbol: string;
  date: string;
  close: number;
  open?: string;
  high?: string;
  low?: string;
  volume?: string;
}

const benchmarkRowSchema = z.object({
  symbol: z.string().min(1).default("SPY"),
  date: z.string().min(1),
  close: z.coerce.number(),
  open: z.string().optional(),
  high: z.string().optional(),
  low: z.string().optional(),
  volume: z.string().optional(),
});

export function parseSpyBenchmarkCsv(csv: string): BenchmarkSeedRow[] {
  const { records } = parseCsvRecords(csv);
  return records.map((record, idx) => normalizeBenchmarkRecord(record, idx + 2));
}

function normalizeBenchmarkRecord(record: CsvRecord, rowNumber: number): BenchmarkSeedRow {
  const parsed = benchmarkRowSchema.safeParse({
    symbol: record["symbol"] ?? record["ticker"] ?? "SPY",
    date: record["date"],
    close: record["close"],
    open: record["open"],
    high: record["high"],
    low: record["low"],
    volume: record["volume"],
  });

  if (!parsed.success) {
    const message = parsed.error.issues.map(issue => issue.message).join("; ");
    throw new Error(`Invalid benchmark row ${rowNumber}: ${message}`);
  }

  return parsed.data;
}

export async function seedSpyBenchmarkFromCsv() {
  const db = await getDb();
  if (!db) throw new Error("DATABASE_URL is required to seed benchmarks");

  const csv = readSeedFile("spy_benchmark.csv");
  const rows = parseSpyBenchmarkCsv(csv);
  const userId = resolveSeedUserId();

  logger.info("Seeding SPY benchmark data", { rows: rows.length, userId });

  await db.delete(schema.benchmarks).where(eq(schema.benchmarks.userId, userId));

  if (rows.length > 0) {
    await db.insert(schema.benchmarks).values(
      rows.map(row => ({
        userId,
        symbol: row.symbol,
        date: row.date,
        close: row.close.toString(),
        open: row.open,
        high: row.high,
        low: row.low,
        volume: row.volume,
      })),
    );
  }

  logger.info("Finished seeding SPY benchmark data", { inserted: rows.length, userId });
}

if (require.main === module) {
  seedSpyBenchmarkFromCsv()
    .then(() => logger.info("Benchmark seed complete"))
    .catch(error => {
      logger.error("Failed to seed benchmarks", { message: (error as Error).message });
      process.exit(1);
    });
}
