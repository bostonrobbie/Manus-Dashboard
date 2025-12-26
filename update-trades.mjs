import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { strategies, trades } from './drizzle/schema.ts';
import { eq } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';

// CSV file to strategy mapping
const fileToStrategy = {
  'Timed_VWAP_Entry_–_NQ_1m_w__Long_&_Short_ADX_Filters_+_Distance_Cap_CME_MINI_NQ1!_2025-12-05.csv': 'NQTrend',
  'Timed_VWAP_Entry_–_NQ_1m_w__Long_&_Short_ADX_Filters_+_Distance_Cap_COMEX_GC1!_2025-12-05.csv': 'GCTrend',
  'Timed_VWAP_Entry_–_NQ_1m_w__Long_&_Short_ADX_Filters_+_Distance_Cap_NYMEX_CL1!_2025-12-05.csv': 'CLTrend',
  'Timed_VWAP_Entry_–_NQ_1m_w__Short_ADX_Filter_CME_MINI_ES1!_2025-12-05.csv': 'ESTrend',
  'ES_OR+Gap_Combo_(RVOL+Hurst+VIX)_CME_MINI_ES1!_2025-12-05.csv': 'ESORB',
  'ES_OR+Gap_Combo_—_Modular_CBOT_MINI_YM1!_2025-12-05.csv': 'YMORB',
  'ES_OR+Gap_Combo_—_Modular_CME_MINI_NQ1!_2025-12-05.csv': 'NQORB',
  'Timed_VWAP_Entry_–_NQ_1m_w__Long_&_Short_ADX_Filters_+_Distance_Cap_CME_BTC1!_2025-12-05.csv': 'BTCTrend',
};

function parseCSV(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim());
  
  // Skip header (first line)
  const dataLines = lines.slice(1);
  
  // Group trades by Trade # (every 2 lines = 1 complete trade)
  const tradesData = [];
  for (let i = 0; i < dataLines.length; i += 2) {
    if (i + 1 >= dataLines.length) break;
    
    const entryLine = dataLines[i];
    const exitLine = dataLines[i + 1];
    
    if (!entryLine || !exitLine) continue;
    
    const entryParts = entryLine.split(',');
    const exitParts = exitLine.split(',');
    
    // Parse entry
    const tradeNum = entryParts[0];
    const entryType = entryParts[1]?.trim();
    const entryDateTime = entryParts[2]?.trim();
    const entryPriceStr = entryParts[4]?.trim();
    
    // Parse exit
    const exitDateTime = exitParts[2]?.trim();
    const exitPriceStr = exitParts[4]?.trim();
    const pnlStr = exitParts[7]?.trim();
    const pnlPercentStr = exitParts[8]?.trim();
    
    if (!entryDateTime || !exitDateTime || !entryPriceStr || !exitPriceStr || !pnlStr) {
      continue;
    }
    
    // Determine direction
    let direction = 'Long';
    if (entryType && entryType.toLowerCase().includes('short')) {
      direction = 'Short';
    }
    
    // Parse numbers safely
    const entryPrice = parseFloat(entryPriceStr);
    const exitPrice = parseFloat(exitPriceStr);
    const pnl = parseFloat(pnlStr);
    const pnlPercent = parseFloat(pnlPercentStr);
    
    // Skip if any value is NaN
    if (isNaN(entryPrice) || isNaN(exitPrice) || isNaN(pnl) || isNaN(pnlPercent)) {
      console.log(`   ⚠️  Skipping trade with invalid numbers: entry=${entryPriceStr}, exit=${exitPriceStr}, pnl=${pnlStr}, pnl%=${pnlPercentStr}`);
      continue;
    }
    
    tradesData.push({
      entryDate: new Date(entryDateTime),
      exitDate: new Date(exitDateTime),
      direction,
      entryPrice: Math.round(entryPrice * 100), // Convert to cents
      exitPrice: Math.round(exitPrice * 100),
      quantity: 1,
      pnl: Math.round(pnl * 100), // Convert to cents
      pnlPercent: Math.round(pnlPercent * 10000), // Convert to basis points (0.01% = 100)
      commission: 0,
    });
  }
  
  return tradesData;
}

async function main() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  const db = drizzle(connection);
  
  try {
    // Get all strategies
    const allStrategies = await db.select().from(strategies);
    const strategyMap = Object.fromEntries(
      allStrategies.map(s => [s.symbol, s])
    );
    
    console.log('Starting trade update...\n');
    
    let totalDeleted = 0;
    let totalInserted = 0;
    
    for (const [filename, strategySymbol] of Object.entries(fileToStrategy)) {
      const strategy = strategyMap[strategySymbol];
      if (!strategy) {
        console.log(`⚠️  Strategy ${strategySymbol} not found, skipping ${filename}`);
        continue;
      }
      
      const filePath = path.join('/home/ubuntu/upload', filename);
      if (!fs.existsSync(filePath)) {
        console.log(`⚠️  File not found: ${filename}`);
        continue;
      }
      
      console.log(`\n📊 Processing ${strategy.name} (${strategySymbol})...`);
      
      // Delete existing trades for this strategy
      const deleteResult = await db.delete(trades).where(eq(trades.strategyId, strategy.id));
      console.log(`   ✓ Deleted ${deleteResult[0]?.affectedRows || 0} old trades`);
      totalDeleted += deleteResult[0]?.affectedRows || 0;
      
      // Parse CSV
      const tradesData = parseCSV(filePath);
      console.log(`   ✓ Parsed ${tradesData.length} trades from CSV`);
      
      // Insert new trades in batches
      const batchSize = 500;
      for (let i = 0; i < tradesData.length; i += batchSize) {
        const batch = tradesData.slice(i, i + batchSize);
        const tradesToInsert = batch.map(t => ({
          ...t,
          strategyId: strategy.id,
        }));
        
        await db.insert(trades).values(tradesToInsert);
        console.log(`   ✓ Inserted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(tradesData.length / batchSize)} (${tradesToInsert.length} trades)`);
      }
      
      totalInserted += tradesData.length;
    }
    
    console.log(`\n✅ Update complete!`);
    console.log(`   Total deleted: ${totalDeleted} trades`);
    console.log(`   Total inserted: ${totalInserted} trades`);
    
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

main().catch(console.error);
