import { env } from "./utils/env";
import { createLogger } from "./utils/logger";
import { createServer } from "./app";

const logger = createLogger("bootstrap");
const app = createServer();

const port = env.port;
const host = env.host;

logger.info("Starting Manus dashboard server", {
  mode: env.modeLabel,
  mockUserEnabled: env.mockUserEnabled,
  manusReady: env.manusReady,
  headers: {
    user: env.manusAuthHeaderUser,
    workspace: env.manusAuthHeaderWorkspace,
  },
});

app.listen(port, host, () => {
  logger.info("Server listening", { url: `http://${host}:${port}`, mode: env.modeLabel });
});

export type { AppRouter } from "./routers";
