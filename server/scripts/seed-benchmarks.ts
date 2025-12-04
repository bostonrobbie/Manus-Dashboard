#!/usr/bin/env tsx
import { db } from "../db";
import { benchmarks } from "../../drizzle/schema";
import * as fs from "fs";
import * as path from "path";
import { parse } from "csv-parse/sync";

const SEED_USER_ID = 1;
const BATCH_SIZE = 1000;

interface BenchmarkRow { date: string; symbol: string; open: string; high: string; low: string; close: string; volume: string; }

async function main() {
  console.log("🌱 Seeding benchmark data...");
  const csvPath = path.join(process.cwd(), "data", "seed", "spy_benchmark.csv");
  if (!fs.existsSync(csvPath)) {
    console.error(`❌ File not found: ${csvPath}`);
    process.exit(1);
  }

  const records = parse(fs.readFileSync(csvPath, "utf-8"), { columns: true, skip_empty_lines: true }) as BenchmarkRow[];
  console.log(`📊 Found ${records.length} benchmark rows to seed`);

  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);
    const values = batch.map(record => ({
      userId: SEED_USER_ID,
      symbol: record.symbol,
      date: record.date,
      open: record.open,
      high: record.high,
      low: record.low,
      close: record.close,
      volume: record.volume,
    }));

    await db.insert(benchmarks).values(values).onDuplicateKeyUpdate({ set: { id: db.raw(`id`) } });
    console.log(`✅ Inserted batch ${i / BATCH_SIZE + 1} of ${Math.ceil(records.length / BATCH_SIZE)}`);
  }

  console.log("\n✨ Seeding complete!");
  process.exit(0);
}

main().catch(console.error);
