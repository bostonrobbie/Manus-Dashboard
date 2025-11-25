import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  // Log cookie presence for debugging
  const cookies = opts.req.headers.cookie;
  console.log("[Context] Creating TRPC context for:", opts.req.url);
  console.log("[Context] Cookie header present:", !!cookies);
  console.log("[Context] Cookie header value:", cookies ? cookies.substring(0, 100) + "..." : "(none)");

  try {
    user = await sdk.authenticateRequest(opts.req);
    console.log("[Context] Authentication result:", user ? `User ${user.id} (${user.email})` : "No user");
  } catch (error) {
    // Authentication is optional for public procedures.
    console.log("[Context] Authentication error:", error);
    user = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
