/**
 * Check what dates the API returns for equity curve
 */

// Simulate the date range calculation from routers.ts
const now = new Date();
const oneYearAgo = new Date(now);
oneYearAgo.setFullYear(now.getFullYear() - 1);

console.log('Expected time range for 1Y:');
console.log('  Start:', oneYearAgo.toISOString().split('T')[0]);
console.log('  End (now):', now.toISOString().split('T')[0]);
console.log('');

// Calculate days between
const daysDiff = Math.floor((now - oneYearAgo) / (1000 * 60 * 60 * 24));
console.log('Expected days in range:', daysDiff);
console.log('Expected equity points (daily):', daysDiff + 1); // inclusive
console.log('');

// Test the forward-fill loop logic
let count = 0;
const start = new Date(oneYearAgo);
start.setHours(0, 0, 0, 0);
const end = new Date(now);
end.setHours(0, 0, 0, 0);

for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
  count++;
}

console.log('Actual loop iterations:', count);
console.log('Last date in loop:', new Date(end).toISOString().split('T')[0]);
