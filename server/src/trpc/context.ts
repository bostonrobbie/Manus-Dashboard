import type { inferAsyncReturnType } from "@trpc/server";
import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";

export async function createContext(opts: CreateExpressContextOptions) {
  const userId = 1; // demo identity for Manus-compatible dashboards
  return { req: opts.req, res: opts.res, userId };
}

export type Context = inferAsyncReturnType<typeof createContext>;
