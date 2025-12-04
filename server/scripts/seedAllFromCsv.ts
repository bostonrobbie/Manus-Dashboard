import { createLogger } from "@server/utils/logger";

import { seedStrategiesFromCsv } from "./seedStrategiesFromCsv";
import { seedTradesFromCsv } from "./seedTradesFromCsv";
import { seedSpyBenchmarkFromCsv } from "./seedSpyBenchmarkFromCsv";

const logger = createLogger("seed-all");

export async function seedAllFromCsv() {
  logger.info("Starting full CSV seed run");
  await seedStrategiesFromCsv();
  await seedTradesFromCsv();
  await seedSpyBenchmarkFromCsv();
  logger.info("Completed full CSV seed run");
}

if (require.main === module) {
  seedAllFromCsv().catch(error => {
    logger.error("Seed run failed", { message: (error as Error).message });
    process.exit(1);
  });
}
