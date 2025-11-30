import assert from "node:assert";
import test from "node:test";
import { TRPCError } from "@trpc/server";

import { trpcErrorFormatter } from "@server/trpc/router";

test("masks internal errors", () => {
  const shape = {
    message: "boom",
    code: "INTERNAL_SERVER_ERROR" as const,
    data: { code: "INTERNAL_SERVER_ERROR" as const, httpStatus: 500, path: "test" },
  };

  const formatted = trpcErrorFormatter({
    shape,
    error: new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "boom" }),
    ctx: null,
    type: "query",
    path: "test",
    input: undefined,
  } as any);

  assert.strictEqual(formatted.message, "Internal server error");
  assert.strictEqual(formatted.data?.auth, false);
  assert.strictEqual(formatted.data?.code, "INTERNAL_SERVER_ERROR");
});

test("preserves auth error messaging", () => {
  const shape = {
    message: "unauthorized",
    code: "UNAUTHORIZED" as const,
    data: { code: "UNAUTHORIZED" as const, httpStatus: 401, path: "auth.test" },
  };

  const formatted = trpcErrorFormatter({
    shape,
    error: new TRPCError({ code: "UNAUTHORIZED", message: "Authentication required" }),
    ctx: null,
    type: "query",
    path: "auth.test",
    input: undefined,
  } as any);

  assert.strictEqual(formatted.message, "Authentication required");
  assert.strictEqual(formatted.data?.auth, true);
});
