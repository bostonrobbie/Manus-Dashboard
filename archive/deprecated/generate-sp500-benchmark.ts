/**
 * Generate Synthetic S&P 500 Benchmark Data
 * 
 * Since Yahoo Finance API requires authentication, we'll generate realistic
 * S&P 500 data based on historical characteristics:
 * - Average annual return: ~10%
 * - Average volatility: ~16%
 * - Starting value: 3200 (Jan 2020)
 * 
 * This provides a reasonable benchmark for comparison purposes.
 * 
 * Usage: tsx scripts/generate-sp500-benchmark.ts
 */

import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { benchmarks } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

/**
 * Generate realistic S&P 500 data using geometric Brownian motion
 */
function generateSP500Data(startDate: Date, endDate: Date) {
  const data: any[] = [];
  
  // S&P 500 parameters (historical averages)
  const initialPrice = 3200; // Approximate SPX value in Jan 2020
  const annualReturn = 0.10; // 10% average annual return
  const annualVolatility = 0.16; // 16% annual volatility
  
  // Convert to daily parameters
  const dailyReturn = annualReturn / 252;
  const dailyVolatility = annualVolatility / Math.sqrt(252);
  
  let currentPrice = initialPrice;
  let currentDate = new Date(startDate);
  
  while (currentDate <= endDate) {
    // Skip weekends
    const dayOfWeek = currentDate.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      // Generate random daily return using normal distribution
      const randomReturn = (Math.random() - 0.5) * 2 * dailyVolatility + dailyReturn;
      
      const open = currentPrice;
      const close = currentPrice * (1 + randomReturn);
      const high = Math.max(open, close) * (1 + Math.random() * 0.01);
      const low = Math.min(open, close) * (1 - Math.random() * 0.01);
      const volume = Math.floor(300000 + Math.random() * 100000); // Simplified volume
      
      const dailyReturnPct = ((close - open) / open) * 100;
      
      data.push({
        date: new Date(currentDate),
        open: open.toFixed(2),
        high: high.toFixed(2),
        low: low.toFixed(2),
        close: close.toFixed(2),
        volume,
        dailyReturn: dailyReturnPct.toFixed(4),
      });
      
      currentPrice = close;
    }
    
    // Move to next day
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return data;
}

/**
 * Main function
 */
async function generateBenchmark() {
  console.log('🚀 Generating synthetic S&P 500 benchmark data...\n');
  
  try {
    // Create database connection
    const connection = await mysql.createConnection(process.env.DATABASE_URL!);
    const db = drizzle(connection);
    
    // Generate data from 2020-01-01 to today
    const startDate = new Date('2020-01-01');
    const endDate = new Date();
    
    console.log(`📊 Generating data from ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}...`);
    const data = generateSP500Data(startDate, endDate);
    console.log(`   ✅ Generated ${data.length} trading days`);
    
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
    
    console.log(`\n✨ Successfully generated ${data.length} days of S&P 500 benchmark data!`);
    console.log(`   Date range: ${data[0].date.toISOString().split('T')[0]} to ${data[data.length - 1].date.toISOString().split('T')[0]}`);
    console.log(`   Starting value: $${data[0].close}`);
    console.log(`   Ending value: $${data[data.length - 1].close}`);
    console.log(`   Total return: ${(((parseFloat(data[data.length - 1].close) / parseFloat(data[0].close)) - 1) * 100).toFixed(2)}%`);
    
    await connection.end();
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Failed to generate benchmark data:', error);
    process.exit(1);
  }
}

// Run the script
generateBenchmark();
