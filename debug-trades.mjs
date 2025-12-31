import mysql from 'mysql2/promise';

async function main() {
  const conn = await mysql.createConnection({
    uri: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  console.log("=== Today's Webhook Logs ===");
  const [webhookLogs] = await conn.execute(`
    SELECT id, strategyId, status, tradeId, createdAt, isTest 
    FROM webhook_logs 
    WHERE DATE(createdAt) = CURDATE() 
    ORDER BY createdAt DESC 
    LIMIT 20
  `);
  console.log(webhookLogs);

  console.log("\n=== User Subscriptions Table Structure ===");
  const [subCols] = await conn.execute(`DESCRIBE user_subscriptions`);
  console.log(subCols.map(c => c.Field));

  console.log("\n=== All User Subscriptions ===");
  const [subscriptions] = await conn.execute(`
    SELECT us.*, s.name as strategyName
    FROM user_subscriptions us
    JOIN strategies s ON us.strategyId = s.id
    LIMIT 20
  `);
  console.log(subscriptions);

  console.log("\n=== Open Positions ===");
  const [openPositions] = await conn.execute(`
    SELECT * FROM open_positions ORDER BY createdAt DESC LIMIT 10
  `);
  console.log(openPositions);

  console.log("\n=== Recent Trades ===");
  const [recentTrades] = await conn.execute(`
    SELECT t.id, t.strategyId, t.symbol, t.direction, t.entryDate, t.exitDate, t.entryPrice, t.exitPrice, t.pnl, t.createdAt
    FROM trades t
    ORDER BY t.createdAt DESC
    LIMIT 10
  `);
  console.log(recentTrades);

  // Check if the webhook trade ID matches any trade
  console.log("\n=== Checking webhook tradeId linkage ===");
  const webhookTradeIds = webhookLogs.filter(l => l.tradeId).map(l => l.tradeId);
  console.log("Webhook trade IDs:", webhookTradeIds);

  await conn.end();
}

main().catch(console.error);
