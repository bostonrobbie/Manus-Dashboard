import * as db from "./server/db";

async function checkDates() {
  const strategies = await db.getAllStrategies();
  const strategyIds = strategies.map(s => s.id);

  const allTrades = await db.getTrades({
    strategyIds,
    startDate: undefined,
    endDate: new Date(),
    source: "backtest",
  });

  console.log(`Total trades: ${allTrades.length}`);

  if (allTrades.length > 0) {
    const sortedByDate = [...allTrades].sort(
      (a, b) => a.exitDate.getTime() - b.exitDate.getTime()
    );
    console.log(`Earliest trade: ${sortedByDate[0].exitDate.toISOString()}`);
    console.log(
      `Latest trade: ${sortedByDate[sortedByDate.length - 1].exitDate.toISOString()}`
    );
  }

  process.exit(0);
}

checkDates().catch(e => {
  console.error(e);
  process.exit(1);
});
