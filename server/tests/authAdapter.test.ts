import assert from "node:assert";
import test from "node:test";

const originalEnv = { ...process.env };

const resetModules = () => {
  const modules = [
    "../src/utils/env",
    "../src/config/manus",
    "../src/auth/context",
    "../src/auth/manusAdapter",
    "../src/routers/auth",
    "../src/trpc/router",
  ];

  for (const mod of modules) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
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
    DATABASE_URL: "postgres://example",
    MANUS_AUTH_HEADER_USER: "x-manus-user-json",
    MANUS_AUTH_HEADER_WORKSPACE: "x-manus-workspace-id",
    MOCK_USER_ENABLED: "false",
    MANUS_ALLOW_MOCK_ON_AUTH_FAILURE: "false",
    MANUS_AUTH_STRICT: "true",
    MANUS_JWT_SECRET: "secret",
  };
  resetModules();

  const { resolveAuth } = await import("../src/auth/context");
  const { parseManusUser } = await import("../src/auth/manusAdapter");

  const req = {
    headers: {
      "x-manus-user-json":
        '{"parsedUser":{"sub":"user:123","email":"test@example.com","workspace_id":"42","roles":["admin","analyst"]}}',
      "x-manus-workspace-id": "42",
    },
  } as any;

  const parsed = parseManusUser(req);
  assert.ok(parsed.user, "Manus parser returned a user");

  const auth = resolveAuth(req);

  assert.strictEqual(auth.mode, "manus");
  assert.ok(auth.user);
  assert.strictEqual(auth.user?.id, 123);
  assert.strictEqual(auth.user?.email, "test@example.com");
  assert.strictEqual(auth.user?.workspaceId, 42);
  assert.deepStrictEqual(auth.user?.roles, ["admin", "analyst"]);
  assert.strictEqual(auth.fallbackUsed, false);
});

test("falls back to Manus mock user when allowed", async () => {
  process.env = {
    ...originalEnv,
    MANUS_MODE: "true",
    DATABASE_URL: "postgres://example",
    MANUS_ALLOW_MOCK_ON_AUTH_FAILURE: "true",
    MANUS_AUTH_STRICT: "false",
    MOCK_USER_ENABLED: "false",
    MANUS_JWT_SECRET: "secret",
  };
  resetModules();

  const { resolveAuth, MANUS_FALLBACK_USER } = await import("../src/auth/context");

  const req = { headers: {} } as any;
  const auth = resolveAuth(req);

  assert.strictEqual(auth.mode, "manus");
  assert.deepStrictEqual(auth.user, MANUS_FALLBACK_USER);
  assert.strictEqual(auth.fallbackUsed, true);
});

test("throws when Manus auth is strict and user missing", async () => {
  process.env = {
    ...originalEnv,
    MANUS_MODE: "true",
    DATABASE_URL: "postgres://example",
    MANUS_ALLOW_MOCK_ON_AUTH_FAILURE: "false",
    MANUS_AUTH_STRICT: "true",
    MOCK_USER_ENABLED: "false",
    MANUS_JWT_SECRET: "secret",
  };
  resetModules();

  const { resolveAuth } = await import("../src/auth/context");
  const { authedProcedure, router } = await import("../src/trpc/router");

  const req = { headers: {} } as any;
  const auth = resolveAuth(req);

  const testRouter = router({
    ping: authedProcedure.query(() => "pong"),
  });

  const caller = testRouter.createCaller({ req, res: {} as any, auth, user: auth.user });

  await assert.rejects(() => caller.ping(), (error: any) => {
    assert.strictEqual(error.code, "UNAUTHORIZED");
    assert.match(String(error.message), /strict mode/i);
    return true;
  });
});

test("auth debug endpoint returns headers when enabled", async () => {
  process.env = {
    ...originalEnv,
    AUTH_DEBUG_ENABLED: "true",
  };
  resetModules();

  const { resolveAuth } = await import("../src/auth/context");
  const { authRouter } = await import("../src/routers/auth");

  const req = { headers: { "x-demo": "demo", authorization: "secret" } } as any;
  const auth = resolveAuth(req);

  const caller = authRouter.createCaller({ req, res: {} as any, auth, user: auth.user });
  const debug = await caller.debug();

  assert.strictEqual(debug.enabled, true);
  assert.ok(debug.rawHeaders);
  assert.strictEqual(debug.rawHeaders?.["x-demo"], "demo");
  assert.ok(!("authorization" in (debug.rawHeaders ?? {})));
});
