import { env } from "./utils/env";
import { createServer } from "./app";

const app = createServer();

const port = env.port;
const host = "0.0.0.0";

app.listen(port, host, () => {
  console.log(`[server] listening on http://${host}:${port}`);
});

export type { AppRouter } from "./routers";
