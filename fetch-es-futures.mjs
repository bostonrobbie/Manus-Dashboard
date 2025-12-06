#!/usr/bin/env node
/**
 * Fetch ES futures historical data and populate benchmarks table
 * Uses Yahoo Finance API to get E-mini S&P 500 futures data (ES=F)
 */

import { callDataApi } from "./server/_core/dataApi.ts";
import { getDb } from "./server/db.ts";
import { benchmarks } from "./drizzle/schema.ts";

async function fetchESFuturesData() {
  console.log("Fetching ES futures historical data...");
  
  try {
    // Fetch ES futures data (ES=F symbol for continuous contract)
    const response = await callDataApi("YahooFinance/get_stock_chart", {
      query: {
        symbol: 'ES=F',  // E-mini S&P 500 futures
        region: 'US',
        interval: '1d',  // Daily data
        range: 'max',    // Maximum available history
        includeAdjustedClose: 'true',
      },
    });

    if (!response || !response.chart || !response.chart.result || response.chart.result.length === 0) {
      console.error("No data returned from API");
      return;
    }

    const result = response.chart.result[0];
    const timestamps = result.timestamp;
    const quotes = result.indicators.quote[0];

    console.log(`Received ${timestamps.length} data points`);

    // Prepare data for database insertion
    const db = await getDb();
    if (!db) {
      console.error("Database not available");
      return;
    }

    // Clear existing benchmark data
    console.log("Clearing existing benchmark data...");
    await db.delete(benchmarks);

    // Insert new ES futures data
    console.log("Inserting ES futures data...");
    let insertedCount = 0;
    let skippedCount = 0;

    for (let i = 0; i < timestamps.length; i++) {
      const date = new Date(timestamps[i] * 1000);
      const open = quotes.open[i];
      const high = quotes.high[i];
      const low = quotes.low[i];
      const close = quotes.close[i];
      const volume = quotes.volume[i];

      // Skip if any price data is null
      if (open === null || high === null || low === null || close === null) {
        skippedCount++;
        continue;
      }

      // Convert to cents (multiply by 100)
      await db.insert(benchmarks).values({
        date,
        open: Math.round(open * 100),
        high: Math.round(high * 100),
        low: Math.round(low * 100),
        close: Math.round(close * 100),
        volume: volume || 0,
      });

      insertedCount++;
    }

    console.log(`✅ Successfully inserted ${insertedCount} ES futures data points`);
    console.log(`⚠️  Skipped ${skippedCount} data points with null values`);
    console.log(`Date range: ${new Date(timestamps[0] * 1000).toLocaleDateString()} to ${new Date(timestamps[timestamps.length - 1] * 1000).toLocaleDateString()}`);

  } catch (error) {
    console.error("Error fetching ES futures data:", error);
    throw error;
  }
}

// Run the script
fetchESFuturesData()
  .then(() => {
    console.log("ES futures data fetch complete");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Failed to fetch ES futures data:", error);
    process.exit(1);
  });
