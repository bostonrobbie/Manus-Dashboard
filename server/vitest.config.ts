import { defineConfig } from "vitest/config";
import { fileURLToPath } from "url";
import { resolve } from "path";

const rootDir = fileURLToPath(new URL("./", import.meta.url));

export default defineConfig({
  test: {
    include: ["tests/**/*.vitest.ts"],
    environment: "node",
    globals: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov", "html"],
    },
  },
  resolve: {
    alias: {
      "@server": resolve(rootDir, "./"),
      "@shared": resolve(rootDir, "../shared"),
      "@drizzle": resolve(rootDir, "../drizzle"),
    },
  },
});
