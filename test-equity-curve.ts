/**
 * Test script to check equity curve data points for 1Y time range
 */
import { db } from './server/db';
import { getAllTrades } from './server/db';
import { calculateEquityCurve, forwardFillEquityCurve } from './server/analytics';

async function testEquityCurve() {
  console.log('Testing equity curve for 1Y time range...\n');
  
  const now = new Date();
  const oneYearAgo = new Date(now);
  oneYearAgo.setFullYear(now.getFullYear() - 1);
  
  console.log('Time Range:');
  console.log('  Start:', oneYearAgo.toISOString().split('T')[0]);
  console.log('  End:', now.toISOString().split('T')[0]);
  console.log('');
  
  // Get all trades
  const allTrades = await getAllTrades();
  console.log('Total trades in database:', allTrades.length);
  
  // Filter trades by time range
  const filteredTrades = allTrades.filter(trade => {
    const exitDate = new Date(trade.exitDate);
    return exitDate >= oneYearAgo && exitDate <= now;
  });
  console.log('Trades in 1Y range:', filteredTrades.length);
  console.log('');
  
  if (filteredTrades.length > 0) {
    const firstTrade = filteredTrades[0];
    const lastTrade = filteredTrades[filteredTrades.length - 1];
    console.log('First trade exit date:', new Date(firstTrade.exitDate).toISOString().split('T')[0]);
    console.log('Last trade exit date:', new Date(lastTrade.exitDate).toISOString().split('T')[0]);
    console.log('');
  }
  
  // Calculate equity curve
  const equityCurve = calculateEquityCurve(filteredTrades, 100000);
  console.log('Equity curve points (before forward-fill):', equityCurve.length);
  
  if (equityCurve.length > 0) {
    const firstPoint = equityCurve[0];
    const lastPoint = equityCurve[equityCurve.length - 1];
    console.log('First equity point date:', new Date(firstPoint.date).toISOString().split('T')[0]);
    console.log('Last equity point date:', new Date(lastPoint.date).toISOString().split('T')[0]);
    console.log('');
  }
  
  // Forward-fill equity curve
  const filledCurve = forwardFillEquityCurve(equityCurve, oneYearAgo, now);
  console.log('Equity curve points (after forward-fill):', filledCurve.length);
  
  if (filledCurve.length > 0) {
    const firstPoint = filledCurve[0];
    const lastPoint = filledCurve[filledCurve.length - 1];
    console.log('First filled point date:', new Date(firstPoint.date).toISOString().split('T')[0]);
    console.log('Last filled point date:', new Date(lastPoint.date).toISOString().split('T')[0]);
    console.log('');
    
    // Show last 5 points
    console.log('Last 5 equity points:');
    filledCurve.slice(-5).forEach(point => {
      console.log(`  ${new Date(point.date).toISOString().split('T')[0]}: $${point.equity.toFixed(2)}`);
    });
  }
  
  process.exit(0);
}

testEquityCurve().catch(console.error);
