import fs from "node:fs";
import path from "node:path";

import { ingestTradesCsv } from "../src/services/tradeIngestion";
import "../src/utils/env";

async function main() {
  const dataDir = path.resolve(__dirname, "../data");
  if (!fs.existsSync(dataDir)) {
    console.error(`Data directory not found at ${dataDir}`);
    process.exit(1);
  }

  const files = fs.readdirSync(dataDir).filter(file => file.toLowerCase().endsWith(".csv"));
  if (files.length === 0) {
    console.warn(`No CSV files found in ${dataDir}`);
    return;
  }

  for (const file of files) {
    const fullPath = path.join(dataDir, file);
    const contents = fs.readFileSync(fullPath, "utf8");
    const strategyName = path.parse(file).name;

    console.log(`Loading ${file}...`);
    const result = await ingestTradesCsv({ csv: contents, userId: 1, defaultStrategyName: strategyName });
    console.log(
      `Inserted ${result.insertedTrades}/${result.rowsParsed} rows (strategies created: ${result.strategiesCreated}) for ${file}`,
    );
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
