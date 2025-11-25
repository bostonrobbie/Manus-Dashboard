/**
 * Sample Data Generator for Trading Dashboard
 * 
 * Run with: pnpm tsx scripts/seed-sample-data.ts
 * 
 * This script creates realistic sample trading data to test the dashboard
 */

import { db } from "../drizzle/client";
import * as schema from "../drizzle/schema";
const { users, strategies, trades, equityCurve, positions } = schema;
import { eq } from "drizzle-orm";

async function generateSampleData() {
  console.log("🌱 Seeding sample data...\n");

  // 1. Get or create test user
  console.log("1️⃣  Creating test user...");
  const existingUser = await db.select().from(users).where(eq(users.email, "demo@tradepulse.com")).limit(1);
  
  let userId: number;
  if (existingUser.length > 0) {
    userId = existingUser[0].id;
    console.log(`   ✅ Using existing user (ID: ${userId})`);
  } else {
    const newUser = await db.insert(users).values({
      openId: "demo-user-123",
      name: "Demo Trader",
      email: "demo@tradepulse.com",
      apiKey: "tp_demo_" + Math.random().toString(36).substring(2, 15),
    });
    userId = Number(newUser.insertId);
    console.log(`   ✅ Created new user (ID: ${userId})`);
  }

  // 2. Create strategies
  console.log("\n2️⃣  Creating trading strategies...");
  const swingStrategy = await db.insert(strategies).values({
    userId,
    name: "Momentum Swing",
    description: "Trend-following swing strategy on daily timeframe",
    type: "swing",
    isActive: 1,
  });
  const swingStrategyId = Number(swingStrategy.insertId);

  const intradayStrategy = await db.insert(strategies).values({
    userId,
    name: "Scalping 5min",
    description: "High-frequency scalping on 5-minute charts",
    type: "intraday",
    isActive: 1,
  });
  const intradayStrategyId = Number(intradayStrategy.insertId);
  console.log(`   ✅ Created 2 strategies`);

  // 3. Generate trades (last 30 days)
  console.log("\n3️⃣  Generating sample trades...");
  const symbols = ["SPY", "QQQ", "AAPL", "TSLA", "NVDA", "MSFT"];
  const now = new Date();
  const tradesData = [];

  for (let i = 0; i < 50; i++) {
    const daysAgo = Math.floor(Math.random() * 30);
    const entryTime = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
    const symbol = symbols[Math.floor(Math.random() * symbols.length)];
    const side = Math.random() > 0.5 ? "long" : "short";
    const entryPrice = 100 + Math.random() * 400;
    const quantity = Math.floor(Math.random() * 20) + 1;
    
    // 60% win rate
    const isWin = Math.random() < 0.6;
    const priceChange = isWin 
      ? (Math.random() * 0.03 + 0.01) // 1-4% gain
      : -(Math.random() * 0.02 + 0.005); // 0.5-2.5% loss
    
    const exitPrice = entryPrice * (1 + priceChange);
    const exitTime = new Date(entryTime.getTime() + (Math.random() * 24 * 60 * 60 * 1000));
    
    const entryValue = entryPrice * quantity;
    const exitValue = exitPrice * quantity;
    const pnl = side === "long" ? (exitValue - entryValue) : (entryValue - exitValue);
    const pnlPercent = (pnl / entryValue) * 100;
    const holdingPeriod = Math.floor((exitTime.getTime() - entryTime.getTime()) / (1000 * 60));

    tradesData.push({
      userId,
      strategyId: Math.random() > 0.5 ? swingStrategyId : intradayStrategyId,
      externalId: `trade_${i}_${Date.now()}`,
      symbol,
      side,
      entryPrice: entryPrice.toFixed(2),
      entryTime,
      quantity: quantity.toString(),
      exitPrice: exitPrice.toFixed(2),
      exitTime,
      pnl: pnl.toFixed(2),
      pnlPercent: pnlPercent.toFixed(4),
      holdingPeriod,
    });
  }

  await db.insert(trades).values(tradesData);
  console.log(`   ✅ Created ${tradesData.length} trades`);

  // 4. Generate equity curve (last 30 days)
  console.log("\n4️⃣  Generating equity curve...");
  let equity = 100000; // Starting with $100k
  const equityData = [];

  for (let i = 30; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    
    // Random daily return between -2% and +3%
    const dailyReturn = (Math.random() * 5 - 2) / 100;
    const dailyPnL = equity * dailyReturn;
    equity += dailyPnL;

    equityData.push({
      userId,
      date,
      equity: equity.toFixed(2),
      dailyPnL: dailyPnL.toFixed(2),
      dailyReturn: (dailyReturn * 100).toFixed(4),
    });
  }

  await db.insert(equityCurve).values(equityData);
  console.log(`   ✅ Created ${equityData.length} equity curve points`);

  // 5. Create current positions
  console.log("\n5️⃣  Creating current positions...");
  const positionsData = [
    {
      userId,
      strategyId: swingStrategyId,
      symbol: "SPY",
      side: "long" as const,
      quantity: "10",
      entryPrice: "580.50",
      currentPrice: "585.20",
      unrealizedPnL: "47.00",
      unrealizedPnLPercent: "0.81",
      entryTime: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
    },
    {
      userId,
      strategyId: intradayStrategyId,
      symbol: "NVDA",
      side: "long" as const,
      quantity: "5",
      entryPrice: "875.30",
      currentPrice: "882.10",
      unrealizedPnL: "34.00",
      unrealizedPnLPercent: "0.78",
      entryTime: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
    },
  ];

  await db.insert(positions).values(positionsData);
  console.log(`   ✅ Created ${positionsData.length} positions`);

  console.log("\n✨ Sample data seeded successfully!\n");
  console.log("📊 Summary:");
  console.log(`   - User ID: ${userId}`);
  console.log(`   - Strategies: 2 (Swing + Intraday)`);
  console.log(`   - Trades: ${tradesData.length}`);
  console.log(`   - Equity Points: ${equityData.length}`);
  console.log(`   - Current Positions: ${positionsData.length}`);
  console.log(`   - Final Equity: $${equity.toFixed(2)}`);
  console.log("\n🎉 Dashboard should now display data!");
  console.log(`\n🔑 API Key: ${(await db.select().from(users).where(eq(users.id, userId)).limit(1))[0].apiKey}`);
  
  process.exit(0);
}

generateSampleData().catch((error) => {
  console.error("❌ Error seeding data:", error);
  process.exit(1);
});
