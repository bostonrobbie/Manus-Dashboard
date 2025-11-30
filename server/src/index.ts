import { env } from "./utils/env";
import { createServer } from "./app";

const app = createServer();

const port = env.port;
const host = "0.0.0.0";
const modeLabel = env.manusMode ? "MANUS" : "LOCAL_DEV";

app.listen(port, host, () => {
  console.log(`[server] listening on http://${host}:${port} (${modeLabel}, mockUser=${env.mockUserEnabled})`);
});

export type { AppRouter } from "./routers";
