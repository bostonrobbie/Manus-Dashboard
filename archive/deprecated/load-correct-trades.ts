/**
 * Load correct trade data from user-provided CSVs
 * This script clears existing trades and loads all 11 strategies with correct data
 */

import { readFileSync } from 'fs';
import { getDb } from '../server/db';
import { trades, strategies } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

// Strategy mapping: CSV filename → strategyId
const STRATEGY_MAP = {
  'YMORB.csv': { id: 60001, symbol: 'YM', type: 'intraday' },
  'NQORB.csv': { id: 60002, symbol: 'NQ', type: 'intraday' },
  'ESORB.csv': { id: 60003, symbol: 'ES', type: 'intraday' },
  'NQTrend.csv': { id: 60004, symbol: 'NQ', type: 'intraday' },
  'ESTrend.csv': { id: 60005, symbol: 'ES', type: 'intraday' },
  'GCTrend.csv': { id: 60006, symbol: 'GC', type: 'intraday' },
  'CLTrend.csv': { id: 60007, symbol: 'CL', type: 'intraday' },
  'BTCTrend.csv': { id: 60008, symbol: 'BTC', type: 'intraday' },
  'ESD.csv': { id: 60009, symbol: 'ES', type: 'swing' },
  'NQD.csv': { id: 60010, symbol: 'NQ', type: 'swing' },
  'YMD.csv': { id: 60011, symbol: 'YM', type: 'swing' },
};

interface CSVRow {
  tradeNum: number;
  type: string; // "Entry long", "Exit long", "Entry short", "Exit short"
  dateTime: string;
  signal: string;
  price: number;
  quantity: number;
  netPnL: number;
  cumulativePnL: number;
}

interface Trade {
  strategyId: number;
  symbol: string;
  side: 'long' | 'short';
  quantity: number;
  entryTime: Date;
  exitTime: Date;
  entryPrice: number;
  exitPrice: number;
  pnl: number;
  fees: number;
}

function parseCSV(filepath: string): CSVRow[] {
  const content = readFileSync(filepath, 'utf-8');
  const lines = content.split('\n').filter(l => l.trim());
  
  // Skip header (line 0)
  const rows: CSVRow[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const cols = line.split(',');
    
    if (cols.length < 14) continue; // Skip incomplete rows
    
    rows.push({
      tradeNum: parseInt(cols[0]),
      type: cols[1].trim(),
      dateTime: cols[2].trim(),
      signal: cols[3].trim(),
      price: parseFloat(cols[4]),
      quantity: parseFloat(cols[5]),
      netPnL: parseFloat(cols[7]), // Net P&L USD
      cumulativePnL: parseFloat(cols[13]), // Cumulative P&L USD
    });
  }
  
  return rows;
}

function pairEntryExit(rows: CSVRow[], strategyId: number, symbol: string): Trade[] {
  const trades: Trade[] = [];
  
  // Group rows by trade number
  const tradeGroups = new Map<number, CSVRow[]>();
  
  for (const row of rows) {
    if (!tradeGroups.has(row.tradeNum)) {
      tradeGroups.set(row.tradeNum, []);
    }
    tradeGroups.get(row.tradeNum)!.push(row);
  }
  
  // Process each trade group
  for (const [tradeNum, group] of tradeGroups) {
    const entry = group.find(r => r.type.startsWith('Entry'));
    const exit = group.find(r => r.type.startsWith('Exit'));
    
    if (!entry || !exit) {
      console.warn(`Incomplete trade ${tradeNum}, skipping`);
      continue;
    }
    
    const isLong = entry.type.includes('long');
    
    // Create complete trade
    trades.push({
      strategyId,
      symbol,
      side: isLong ? 'long' : 'short',
      quantity: entry.quantity,
      entryTime: new Date(entry.dateTime),
      exitTime: new Date(exit.dateTime),
      entryPrice: entry.price,
      exitPrice: exit.price,
      pnl: exit.netPnL,
      fees: 0, // Not provided in CSV, assume 0
    });
  }
  
  return trades;
}

async function main() {
  console.log('🚀 Loading correct trade data from CSVs...\n');
  
  const db = await getDb();
  const userId = 1; // Your user ID
  
  // Step 1: Clear existing trades
  console.log('🗑️  Clearing existing trades...');
  await db.delete(trades).where(eq(trades.userId, userId));
  console.log('   ✅ Cleared all existing trades\n');
  
  // Step 2: Load each CSV
  let totalTrades = 0;
  
  for (const [filename, strategyInfo] of Object.entries(STRATEGY_MAP)) {
    const filepath = `/home/ubuntu/upload/${filename}`;
    
    console.log(`📊 Loading ${filename} (Strategy ${strategyInfo.id} - ${strategyInfo.symbol})...`);
    
    try {
      // Parse CSV
      const rows = parseCSV(filepath);
      console.log(`   Parsed ${rows.length} CSV rows`);
      
      // Pair entry/exit
      const tradesToInsert = pairEntryExit(rows, strategyInfo.id, strategyInfo.symbol);
      console.log(`   Created ${tradesToInsert.length} complete trades`);
      
      // Insert into database
      if (tradesToInsert.length > 0) {
        // Insert in batches of 1000
        for (let i = 0; i < tradesToInsert.length; i += 1000) {
          const batch = tradesToInsert.slice(i, i + 1000);
          await db.insert(trades).values(
            batch.map(t => ({
              userId,
              strategyId: t.strategyId,
              externalId: `${strategyInfo.symbol}_${t.entryTime.getTime()}`,
              symbol: t.symbol,
              side: t.side,
              quantity: t.quantity.toString(),
              entryTime: t.entryTime,
              exitTime: t.exitTime,
              entryPrice: t.entryPrice.toString(),
              exitPrice: t.exitPrice.toString(),
              pnl: t.pnl.toString(),
              pnlPercent: ((t.pnl / (t.entryPrice * t.quantity)) * 100).toFixed(2),
              fees: '0',
              holdingPeriod: Math.floor((t.exitTime.getTime() - t.entryTime.getTime()) / 60000), // minutes
            }))
          );
        }
        console.log(`   ✅ Inserted ${tradesToInsert.length} trades\n`);
        totalTrades += tradesToInsert.length;
      }
    } catch (err) {
      console.error(`   ❌ Error loading ${filename}:`, err);
    }
  }
  
  console.log(`\n🎉 Successfully loaded ${totalTrades} trades across ${Object.keys(STRATEGY_MAP).length} strategies!`);
  
  // Verify counts
  console.log('\n📈 Verification:');
  for (const [filename, strategyInfo] of Object.entries(STRATEGY_MAP)) {
    const count = await db
      .select()
      .from(trades)
      .where(eq(trades.strategyId, strategyInfo.id));
    console.log(`   Strategy ${strategyInfo.id} (${strategyInfo.symbol}): ${count.length} trades`);
  }
  
  process.exit(0);
}

main().catch(console.error);
