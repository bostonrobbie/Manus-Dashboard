import { buildAggregatedEquityCurve } from '../server/portfolio-engine';

async function main() {
  const userId = 1;

  console.log('Testing equity curve generation...\n');

  // Test Combined
  console.log('=== COMBINED (all strategies) ===');
  const combined = await buildAggregatedEquityCurve(userId, { strategyType: 'all' });
  console.log(`Points: ${combined.length}`);
  console.log(`First: ${combined[0]?.date.toISOString().split('T')[0]} | $${combined[0]?.equity.toFixed(2)}`);
  console.log(`Last: ${combined[combined.length - 1]?.date.toISOString().split('T')[0]} | $${combined[combined.length - 1]?.equity.toFixed(2)}`);

  // Test Swing
  console.log('\n=== SWING (strategies 60009, 60010, 60011) ===');
  const swing = await buildAggregatedEquityCurve(userId, { strategyType: 'swing' });
  console.log(`Points: ${swing.length}`);
  console.log(`First: ${swing[0]?.date.toISOString().split('T')[0]} | $${swing[0]?.equity.toFixed(2)}`);
  console.log(`Last: ${swing[swing.length - 1]?.date.toISOString().split('T')[0]} | $${swing[swing.length - 1]?.equity.toFixed(2)}`);

  // Test Intraday
  console.log('\n=== INTRADAY (strategies 60001-60008) ===');
  const intraday = await buildAggregatedEquityCurve(userId, { strategyType: 'intraday' });
  console.log(`Points: ${intraday.length}`);
  console.log(`First: ${intraday[0]?.date.toISOString().split('T')[0]} | $${intraday[0]?.equity.toFixed(2)}`);
  console.log(`Last: ${intraday[intraday.length - 1]?.date.toISOString().split('T')[0]} | $${intraday[intraday.length - 1]?.equity.toFixed(2)}`);

  // Show some sample points from each
  console.log('\n=== SAMPLE POINTS (2020-01-01 to 2020-01-10) ===');
  const sampleDates = combined.filter(p => {
    const date = p.date.toISOString().split('T')[0];
    return date >= '2020-01-01' && date <= '2020-01-10';
  });
  
  console.log('Date       | Combined | Swing | Intraday');
  console.log('-----------|----------|-------|----------');
  for (const point of sampleDates) {
    const date = point.date.toISOString().split('T')[0];
    const swingPoint = swing.find(p => p.date.toISOString().split('T')[0] === date);
    const intradayPoint = intraday.find(p => p.date.toISOString().split('T')[0] === date);
    
    console.log(`${date} | $${point.equity.toFixed(0).padStart(6)} | $${(swingPoint?.equity || 0).toFixed(0).padStart(5)} | $${(intradayPoint?.equity || 0).toFixed(0).padStart(6)}`);
  }

  process.exit(0);
}

main().catch(console.error);
