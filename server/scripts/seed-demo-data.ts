import { eq } from "drizzle-orm";

import { getDb, schema } from "@server/db";
import { ingestTradesCsv } from "@server/services/tradeIngestion";
import { ingestBenchmarksCsv } from "@server/services/benchmarkIngestion";

async function main() {
  const db = await getDb();
  if (!db) throw new Error("DATABASE_URL is required to seed demo data");

  const [workspace] = await db
    .insert(schema.workspaces)
    .values({ externalId: "demo-workspace", name: "Demo Workspace" })
    .onConflictDoNothing()
    .returning();

  const workspaceId = workspace?.id ?? (await db.select().from(schema.workspaces).where(eq(schema.workspaces.externalId, "demo-workspace")))[0]?.id;
  if (!workspaceId) throw new Error("Unable to resolve demo workspace");

  const [user] = await db
    .insert(schema.users)
    .values({ openId: "demo-user", email: "demo@example.com", name: "Demo User", workspaceId })
    .onConflictDoNothing()
    .returning();

  const userId = user?.id ?? (await db.select().from(schema.users).where(eq(schema.users.openId, "demo-user")))[0]?.id;
  if (!userId) throw new Error("Unable to resolve demo user");

  const tradesCsv = `symbol,side,quantity,entryPrice,exitPrice,entryTime,exitTime,strategy,strategyType\nAAPL,long,10,150.25,155.10,2024-05-01T14:30:00Z,2024-05-03T20:00:00Z,Mean Reversion,swing\nSPY,short,5,500.00,480.00,2024-04-15T15:00:00Z,2024-04-20T19:00:00Z,Index Hedge,intraday`;

  await ingestTradesCsv({
    csv: tradesCsv,
    userId,
    workspaceId,
    defaultStrategyName: "Demo",
    defaultStrategyType: "swing",
    fileName: "seed-trades.csv",
  });

  const benchmarksCsv = `symbol,date,close\nSPY,2024-04-15,500.00\nSPY,2024-04-16,501.25\nSPY,2024-04-17,503.00`;

  await ingestBenchmarksCsv({
    csv: benchmarksCsv,
    userId,
    workspaceId,
    fileName: "seed-benchmarks.csv",
  });

  console.log(`Seeded demo workspace ${workspaceId} with trades and benchmarks`);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
