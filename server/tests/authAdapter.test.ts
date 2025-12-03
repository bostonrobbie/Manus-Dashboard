import assert from "node:assert";
import test from "node:test";
import { TRPCError } from "@trpc/server";

const originalEnv = { ...process.env };

const resetModules = () => {
  const modules = ["../utils/env", "../config/manus", "../_core/context", "../_core/trpc", "../routers/auth"];
  for (const mod of modules) {
    try {
      delete require.cache[require.resolve(mod)];
    } catch {
      // ignore missing cache entries
    }
  }
};

test.afterEach(() => {
  process.env = { ...originalEnv };
  resetModules();
});

test("parses Manus headers into a user", async () => {
  process.env = {
    ...originalEnv,
    MANUS_MODE: "true",
    DATABASE_URL: "mysql://example",
    MANUS_AUTH_HEADER_USER: "x-manus-user-json",
    MANUS_AUTH_STRICT: "true",
    MOCK_USER_ENABLED: "false",
  };
  resetModules();

  const { createContext } = await import("../_core/context");

  const req = {
    headers: {
      "x-manus-user-json": '{"id":123,"email":"test@example.com","roles":["admin"]}',
    },
  } as any;

  const ctx = await createContext({ req, res: {} as any } as any);
  assert.strictEqual(ctx.auth.mode, "manus");
  assert.ok(ctx.user);
  assert.strictEqual(ctx.user?.id, 123);
  assert.strictEqual(ctx.user?.email, "test@example.com");
  assert.strictEqual(ctx.user?.role, "admin");
  assert.strictEqual(ctx.auth.strict, true);
});

test("falls back to mock user when allowed", async () => {
  process.env = {
    ...originalEnv,
    MANUS_MODE: "false",
    DATABASE_URL: "mysql://example",
    MANUS_AUTH_STRICT: "false",
    MOCK_USER_ENABLED: "true",
  };
  resetModules();

  const { createContext } = await import("../_core/context");
  const ctx = await createContext({ req: { headers: {} } as any, res: {} as any } as any);

  assert.ok(ctx.user);
  assert.strictEqual(ctx.user?.id, 1);
  assert.strictEqual(ctx.auth.mock, true);
  assert.strictEqual(ctx.user?.role, "admin");
});

test("protected procedures reject missing users", async () => {
  process.env = {
    ...originalEnv,
    MANUS_MODE: "true",
    DATABASE_URL: "mysql://example",
    MANUS_AUTH_STRICT: "true",
    MOCK_USER_ENABLED: "false",
  };
  resetModules();

  const { createContext } = await import("../_core/context");
  const { protectedProcedure, router } = await import("../_core/trpc");

  const testRouter = router({
    ping: protectedProcedure.query(() => "pong"),
  });

  const ctx = await createContext({ req: { headers: {} } as any, res: {} as any } as any);
  const caller = testRouter.createCaller(ctx);

  await assert.rejects(() => caller.ping(), (error: any) => {
    assert.ok(error instanceof TRPCError);
    assert.strictEqual(error.code, "UNAUTHORIZED");
    return true;
  });
});

test("auth debug endpoint returns headers when enabled", async () => {
  process.env = {
    ...originalEnv,
    AUTH_DEBUG_ENABLED: "true",
    MANUS_AUTH_HEADER_USER: "x-manus-user-json",
  };
  resetModules();

  const { createContext } = await import("../_core/context");
  const { authRouter } = await import("../routers/auth");

  const req = { headers: { "x-demo": "demo", authorization: "secret" } } as any;
  const ctx = await createContext({ req, res: {} as any } as any);

  const caller = authRouter.createCaller(ctx);
  const debug = await caller.debug();

  assert.strictEqual(debug.enabled, true);
  assert.ok(debug.rawHeaders);
  assert.strictEqual(debug.rawHeaders["authorization"], "[masked]");
});
