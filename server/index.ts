import { env } from "./utils/env";
import { createLogger } from "./utils/logger";
import { createServer } from "./app";
import { getVersionInfo } from "./version";

const logger = createLogger("bootstrap");
const app = createServer();
const versionInfo = getVersionInfo();

const port = env.port;
const host = env.host;

logger.info("Starting Manus dashboard server", {
  mode: env.modeLabel,
  mockUserEnabled: env.mockUserEnabled,
  manusReady: env.manusReady,
  version: versionInfo.version,
  commit: versionInfo.commit,
  headers: {
    user: env.manusAuthHeaderUser,
  },
});

app.listen(port, host, () => {
  logger.info("Server listening", { url: `http://${host}:${port}`, mode: env.modeLabel });
});

export type { AppRouter } from "./routers";
