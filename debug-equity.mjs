import { db } from './server/db.js';
import * as analytics from './server/analytics.js';

const strategyId = 9;
const now = new Date();
const startDate = new Date(now);
startDate.setFullYear(now.getFullYear() - 1); // 1 year ago
const startingCapital = 100000;

console.log('Start Date:', startDate.toISOString().split('T')[0]);
console.log('End Date:', now.toISOString().split('T')[0]);
console.log('Starting Capital:', startingCapital);
console.log('');

const trades = await db.getTrades({
  strategyIds: [strategyId],
  startDate,
  endDate: now,
});

console.log('Total trades:', trades.length);
if (trades.length > 0) {
  console.log('First trade entry:', trades[0].entryDate.toISOString().split('T')[0]);
  console.log('Last trade exit:', trades[trades.length - 1].exitDate.toISOString().split('T')[0]);
}
console.log('');

const rawEquityCurve = analytics.calculateEquityCurve(trades, startingCapital);
console.log('Raw equity curve points:', rawEquityCurve.length);
if (rawEquityCurve.length > 0) {
  console.log('First point:', {
    date: rawEquityCurve[0].date.toISOString().split('T')[0],
    equity: rawEquityCurve[0].equity,
  });
  console.log('Last point:', {
    date: rawEquityCurve[rawEquityCurve.length - 1].date.toISOString().split('T')[0],
    equity: rawEquityCurve[rawEquityCurve.length - 1].equity,
  });
}
console.log('');

// Test the fix
const equityCurveWithStart = [
  { date: startDate, equity: startingCapital, drawdown: 0 },
  ...rawEquityCurve.slice(1)
];

console.log('Equity curve with start:', equityCurveWithStart.length);
console.log('First point after fix:', {
  date: equityCurveWithStart[0].date.toISOString().split('T')[0],
  equity: equityCurveWithStart[0].equity,
});
if (equityCurveWithStart.length > 1) {
  console.log('Second point after fix:', {
    date: equityCurveWithStart[1].date.toISOString().split('T')[0],
    equity: equityCurveWithStart[1].equity,
  });
}

process.exit(0);
