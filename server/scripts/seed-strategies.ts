#!/usr/bin/env tsx
import { db } from "../db";
import { strategies } from "../../drizzle/schema";
import * as fs from "fs";
import * as path from "path";
import { parse } from "csv-parse/sync";

const SEED_USER_ID = 1;

interface StrategyRow { id: string; name: string; description: string; symbol: string; type: "swing" | "intraday"; }

async function main() {
  console.log("🌱 Seeding strategies...");
  const csvPath = path.join(process.cwd(), "data", "seed", "strategies.csv");
  if (!fs.existsSync(csvPath)) {
    console.error(`❌ File not found: ${csvPath}`);
    process.exit(1);
  }

  const records = parse(fs.readFileSync(csvPath, "utf-8"), { columns: true, skip_empty_lines: true }) as StrategyRow[];
  console.log(`📊 Found ${records.length} strategies to seed`);

  for (const record of records) {
    await db.insert(strategies).values({
      userId: SEED_USER_ID,
      name: record.name,
      description: record.description,
      symbol: record.symbol,
      type: record.type,
    }).onDuplicateKeyUpdate({ set: { name: record.name } });
    console.log(`✅ Inserted/Updated: ${record.name}`);
  }

  console.log("\n✨ Seeding complete!");
  process.exit(0);
}

main().catch(console.error);
