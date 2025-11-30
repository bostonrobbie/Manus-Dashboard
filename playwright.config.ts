import { defineConfig } from "@playwright/test";

const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:4173";
const userHeader =
  process.env.MANUS_USER_HEADER ?? process.env.MANUS_AUTH_HEADER_USER ?? "x-manus-user-json";
const workspaceHeader =
  process.env.MANUS_WORKSPACE_HEADER ?? process.env.MANUS_AUTH_HEADER_WORKSPACE ?? "x-manus-workspace-id";

export default defineConfig({
  timeout: 120_000,
  use: {
    baseURL,
    ignoreHTTPSErrors: true,
    extraHTTPHeaders: {
      [userHeader]: JSON.stringify({ id: 1, email: "e2e@manus.test", name: "E2E", workspaceId: 1, roles: ["admin"] }),
      [workspaceHeader]: "1",
    },
  },
  reporter: [["list"]],
});
