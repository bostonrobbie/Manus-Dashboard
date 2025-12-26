import * as dbModule from './server/db.ts';

async function checkDurations() {
  const trades = await dbModule.getTrades({});
  
  let count24h = 0;
  let countNegative = 0;
  const samples = [];
  
  // Also count by bucket
  const buckets = {
    '<1h': 0,
    '1-2h': 0,
    '2-4h': 0,
    '4-8h': 0,
    '8-24h': 0,
    '>24h': 0
  };
  
  for (const trade of trades) {
    const entry = new Date(trade.entryDate);
    const exit = new Date(trade.exitDate);
    const durationMs = exit.getTime() - entry.getTime();
    const durationMinutes = durationMs / (1000 * 60);
    const durationHours = durationMinutes / 60;
    
    // Bucket assignment
    if (durationMinutes < 60) buckets['<1h']++;
    else if (durationMinutes < 120) buckets['1-2h']++;
    else if (durationMinutes < 240) buckets['2-4h']++;
    else if (durationMinutes < 480) buckets['4-8h']++;
    else if (durationMinutes < 1440) buckets['8-24h']++;
    else buckets['>24h']++;
    
    if (durationMinutes > 1440) {
      count24h++;
      if (samples.length < 5) {
        samples.push({
          id: trade.id,
          entry: trade.entryDate,
          exit: trade.exitDate,
          durationHours: durationHours.toFixed(2),
          durationMinutes: durationMinutes.toFixed(0)
        });
      }
    }
    
    if (durationMinutes < 0) {
      countNegative++;
    }
  }
  
  console.log('Total trades:', trades.length);
  console.log('Trades > 24h:', count24h);
  console.log('Negative duration trades:', countNegative);
  console.log('Bucket distribution:', buckets);
  console.log('Sample >24h trades:', JSON.stringify(samples, null, 2));
  
  process.exit(0);
}

checkDurations();
