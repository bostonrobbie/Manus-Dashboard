import express from "express";
import cors from "cors";
import * as trpcExpress from "@trpc/server/adapters/express";
import { createContext } from "./trpc/context";
import { appRouter } from "./routers";
import { env } from "./utils/env";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use(
  "/trpc",
  trpcExpress.createExpressMiddleware({
    router: appRouter,
    createContext,
  })
);

const port = env.port;
const host = "0.0.0.0";

app.listen(port, host, () => {
  console.log(`[server] listening on http://${host}:${port}`);
});

export type { AppRouter } from "./routers";
