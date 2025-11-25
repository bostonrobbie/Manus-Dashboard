/**
 * Load S&P 500 Historical Data
 * 
 * This script fetches S&P 500 daily closing prices and loads them into the benchmarks table.
 * Data source: Yahoo Finance API (free, no API key required)
 * 
 * Usage: tsx scripts/load-sp500-data.ts
 */

import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { benchmarks } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

/**
 * Fetch S&P 500 data from Yahoo Finance
 */
async function fetchSP500Data(startDate: Date, endDate: Date) {
  const symbol = '%5EGSPC'; // ^GSPC (S&P 500 index)
  
  // Convert dates to Unix timestamps
  const startTimestamp = Math.floor(startDate.getTime() / 1000);
  const endTimestamp = Math.floor(endDate.getTime() / 1000);
  
  const url = `https://query1.finance.yahoo.com/v7/finance/download/${symbol}?period1=${startTimestamp}&period2=${endTimestamp}&interval=1d&events=history`;
  
  console.log(`📊 Fetching S&P 500 data from ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}...`);
  
  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Yahoo Finance API returned ${response.status}: ${response.statusText}`);
    }
    
    const csvText = await response.text();
    const lines = csvText.trim().split('\n');
    
    const data: any[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',');
      
      if (values.length < 6) continue;
      
      const date = new Date(values[0] + 'T16:00:00Z'); // Market close time
      const open = parseFloat(values[1]);
      const high = parseFloat(values[2]);
      const low = parseFloat(values[3]);
      const close = parseFloat(values[4]);
      const volume = parseInt(values[6]) || 0;
      
      // Skip invalid data
      if (isNaN(open) || isNaN(close)) continue;
      
      data.push({
        date,
        open: open.toString(),
        high: high.toString(),
        low: low.toString(),
        close: close.toString(),
        volume,
      });
    }
    
    console.log(`   ✅ Fetched ${data.length} trading days`);
    return data;
    
  } catch (error: any) {
    console.error(`   ❌ Failed to fetch S&P 500 data:`, error.message);
    throw error;
  }
}

/**
 * Calculate daily returns
 */
function calculateDailyReturns(data: any[]) {
  for (let i = 1; i < data.length; i++) {
    const prevClose = parseFloat(data[i - 1].close);
    const currentClose = parseFloat(data[i].close);
    const dailyReturn = ((currentClose - prevClose) / prevClose) * 100;
    data[i].dailyReturn = dailyReturn.toFixed(4);
  }
  
  // First day has no return
  data[0].dailyReturn = '0';
  
  return data;
}

/**
 * Main function
 */
async function loadSP500Data() {
  console.log('🚀 Starting S&P 500 data load...\n');
  
  try {
    // Create database connection
    const connection = await mysql.createConnection(process.env.DATABASE_URL!);
    const db = drizzle(connection);
    
    // Fetch data from 2020-01-01 to today (covers typical backtest period)
    const startDate = new Date('2020-01-01');
    const endDate = new Date();
    
    let data = await fetchSP500Data(startDate, endDate);
    
    // Calculate daily returns
    data = calculateDailyReturns(data);
    
    // Clear existing S&P 500 data
    console.log('🗑️  Clearing existing S&P 500 data...');
    await db.delete(benchmarks).where(eq(benchmarks.symbol, 'SPX'));
    
    // Insert in batches
    console.log('💾 Inserting S&P 500 data into database...');
    const batchSize = 500;
    
    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize).map(row => ({
        symbol: 'SPX',
        date: row.date,
        open: row.open,
        high: row.high,
        low: row.low,
        close: row.close,
        volume: row.volume,
        dailyReturn: row.dailyReturn,
      }));
      
      await db.insert(benchmarks).values(batch);
      console.log(`   ✅ Inserted rows ${i + 1} to ${Math.min(i + batchSize, data.length)}`);
    }
    
    console.log(`\n✨ Successfully loaded ${data.length} days of S&P 500 data!`);
    console.log(`   Date range: ${data[0].date.toISOString().split('T')[0]} to ${data[data.length - 1].date.toISOString().split('T')[0]}`);
    console.log(`   Latest close: $${data[data.length - 1].close}`);
    
    await connection.end();
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Failed to load S&P 500 data:', error);
    process.exit(1);
  }
}

// Run the script
loadSP500Data();
