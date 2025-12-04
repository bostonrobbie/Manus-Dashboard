#!/usr/bin/env tsx
import { db } from "../db";
import { trades } from "../../drizzle/schema";
import * as fs from "fs";
import * as path from "path";
import { parse } from "csv-parse/sync";

const SEED_USER_ID = 1;
const BATCH_SIZE = 500;

interface TradeRow { strategyId: string; symbol: string; side: string; quantity: string; entryPrice: string; exitPrice: string; entryTime: string; exitTime: string; }

function generateNaturalKey(trade: TradeRow): string {
  return `${trade.strategyId}_${trade.symbol}_${trade.entryTime}_${trade.exitTime}`;
}

async function main() {
  console.log("🌱 Seeding trades...");
  const csvPath = path.join(process.cwd(), "data", "seed", "trades.csv");
  if (!fs.existsSync(csvPath)) {
    console.error(`❌ File not found: ${csvPath}`);
    process.exit(1);
  }

  const records = parse(fs.readFileSync(csvPath, "utf-8"), { columns: true, skip_empty_lines: true }) as TradeRow[];
  console.log(`📊 Found ${records.length} trades to seed`);

  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);
    const values = batch.map(record => ({
      userId: SEED_USER_ID,
      strategyId: parseInt(record.strategyId),
      symbol: record.symbol,
      side: record.side,
      quantity: record.quantity,
      entryPrice: record.entryPrice,
      exitPrice: record.exitPrice,
      entryTime: new Date(record.entryTime),
      exitTime: new Date(record.exitTime),
      naturalKey: generateNaturalKey(record),
    }));

    await db.insert(trades).values(values).onDuplicateKeyUpdate({ set: { id: db.raw(`id`) } });
    console.log(`✅ Inserted batch ${i / BATCH_SIZE + 1} of ${Math.ceil(records.length / BATCH_SIZE)}`);
  }

  console.log("\n✨ Seeding complete!");
  process.exit(0);
}

main().catch(console.error);
