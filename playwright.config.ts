import { defineConfig } from "@playwright/test";

const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:4173";
const useManusHeaders = process.env.E2E_USE_MANUS_HEADERS === "true";
const userHeader =
  process.env.MANUS_USER_HEADER ?? process.env.MANUS_AUTH_HEADER_USER ?? "x-manus-user-json";
const workspaceHeader =
  process.env.MANUS_WORKSPACE_HEADER ?? process.env.MANUS_AUTH_HEADER_WORKSPACE ?? "x-manus-workspace-id";

const extraHTTPHeaders = useManusHeaders
  ? {
      [userHeader]: JSON.stringify({ id: 1, email: "e2e@manus.test", name: "E2E", workspaceId: 1, roles: ["admin"] }),
      [workspaceHeader]: "1",
    }
  : undefined;

export default defineConfig({
  timeout: 120_000,
  testDir: "./e2e",
  testMatch: /.*\.spec\.ts/,
  use: {
    baseURL,
    ignoreHTTPSErrors: true,
    extraHTTPHeaders,
  },
  reporter: [["list"]],
  webServer: [
    {
      command: "pnpm --filter server run dev",
      url: "http://localhost:3002/health",
      reuseExistingServer: true,
      timeout: 120_000,
      env: { PORT: "3002" },
    },
    {
      command: "pnpm run e2e:serve",
      url: baseURL,
      reuseExistingServer: true,
      timeout: 120_000,
    },
  ],
});
