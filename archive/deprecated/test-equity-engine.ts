/**
 * Test script to validate the new backtest engine
 * This calls the debug endpoint and prints the equity curve data
 */

import { buildAggregatedEquityCurve, buildEquityCurveFromTrades } from '../server/portfolio-engine';

async function main() {
  const userId = 1; // Your user ID

  console.log('=== TESTING BACKTEST ENGINE ===\n');

  // Test 1: Combined portfolio
  console.log('📊 Test 1: Combined Portfolio (All Strategies)');
  const combined = await buildAggregatedEquityCurve(userId, {
    strategyType: 'all',
  });

  console.log(`  Points: ${combined.length}`);
  console.log(`  Start Date: ${combined[0]?.date.toISOString().split('T')[0]}`);
  console.log(`  End Date: ${combined[combined.length - 1]?.date.toISOString().split('T')[0]}`);
  console.log(`  Start Equity: $${combined[0]?.equity.toFixed(2)}`);
  console.log(`  End Equity: $${combined[combined.length - 1]?.equity.toFixed(2)}`);
  
  const totalReturn = combined.length > 0
    ? ((combined[combined.length - 1].equity / combined[0].equity - 1) * 100)
    : 0;
  console.log(`  Total Return: ${totalReturn.toFixed(2)}%\n`);

  // Show first 10 points
  console.log('  First 10 points:');
  for (let i = 0; i < Math.min(10, combined.length); i++) {
    const p = combined[i];
    console.log(`    ${i}: ${p.date.toISOString().split('T')[0]} | Equity: $${p.equity.toFixed(2)} | Daily PnL: $${p.dailyPnL.toFixed(2)} | Return: ${p.dailyReturn.toFixed(2)}%`);
  }

  // Show last 3 points
  console.log('\n  Last 3 points:');
  for (let i = Math.max(0, combined.length - 3); i < combined.length; i++) {
    const p = combined[i];
    console.log(`    ${i}: ${p.date.toISOString().split('T')[0]} | Equity: $${p.equity.toFixed(2)} | Daily PnL: $${p.dailyPnL.toFixed(2)} | Return: ${p.dailyReturn.toFixed(2)}%`);
  }

  // Test 2: Swing strategies
  console.log('\n📊 Test 2: Swing Strategies Only');
  const swing = await buildAggregatedEquityCurve(userId, {
    strategyType: 'swing',
  });

  console.log(`  Points: ${swing.length}`);
  console.log(`  Start Equity: $${swing[0]?.equity.toFixed(2)}`);
  console.log(`  End Equity: $${swing[swing.length - 1]?.equity.toFixed(2)}`);
  
  const swingReturn = swing.length > 0
    ? ((swing[swing.length - 1].equity / swing[0].equity - 1) * 100)
    : 0;
  console.log(`  Total Return: ${swingReturn.toFixed(2)}%`);

  // Test 3: Intraday strategies
  console.log('\n📊 Test 3: Intraday Strategies Only');
  const intraday = await buildAggregatedEquityCurve(userId, {
    strategyType: 'intraday',
  });

  console.log(`  Points: ${intraday.length}`);
  console.log(`  Start Equity: $${intraday[0]?.equity.toFixed(2)}`);
  console.log(`  End Equity: $${intraday[intraday.length - 1]?.equity.toFixed(2)}`);
  
  const intradayReturn = intraday.length > 0
    ? ((intraday[intraday.length - 1].equity / intraday[0].equity - 1) * 100)
    : 0;
  console.log(`  Total Return: ${intradayReturn.toFixed(2)}%`);

  console.log('\n✅ Engine test complete!');
  process.exit(0);
}

main().catch(console.error);
