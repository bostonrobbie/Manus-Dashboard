import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@shared": path.resolve(__dirname, "../shared"),
      "@server": path.resolve(__dirname, "../server"),
      "@drizzle": path.resolve(__dirname, "../drizzle"),
      "@client": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: path.resolve(__dirname, "src/setupTests.tsx"),
  },
});
