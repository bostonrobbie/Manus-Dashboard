import assert from "node:assert/strict";
import test from "node:test";
import { adminDataRouter } from "@server/routers/adminData";

const adminUser = { id: 1, email: "admin@test", roles: ["admin"], source: "manus" as const };
const regularUser = { id: 2, email: "user@test", roles: ["user"], source: "manus" as const };

const adminCtx = { user: adminUser, auth: { mode: "manus" as const, user: adminUser, mock: false } } as any;
const regularCtx = { user: regularUser, auth: { mode: "manus" as const, user: regularUser, mock: false } } as any;

const pagination = { page: 1, pageSize: 10 } as const;

test("listWorkspaces returns empty array for admin", async () => {
  const caller = adminDataRouter.createCaller(adminCtx);
  const workspaces = await caller.listWorkspaces();
  assert.deepEqual(workspaces, []);
});

test("admin routes enforce elevated roles", async () => {
  const adminCaller = adminDataRouter.createCaller(adminCtx);
  await adminCaller.listWorkspaces();

  const userCaller = adminDataRouter.createCaller(regularCtx);
  await assert.rejects(() => userCaller.listWorkspaces(), (err: any) => err.code === "FORBIDDEN");
});

test("unsupported admin operations surface not found", async () => {
  const caller = adminDataRouter.createCaller(adminCtx);

  await assert.rejects(() => caller.listUploadsForWorkspace(pagination), (err: any) => err.code === "NOT_FOUND");
  await assert.rejects(() => caller.softDeleteByUpload({ uploadId: 1 }), (err: any) => err.code === "NOT_FOUND");
  await assert.rejects(() => caller.softDeleteTradesByFilter({ symbol: "ES" }), (err: any) => err.code === "NOT_FOUND");
  await assert.rejects(
    () => caller.softDeleteBenchmarksByFilter({ symbol: "SPY" } as any),
    (err: any) => err.code === "NOT_FOUND",
  );
});
