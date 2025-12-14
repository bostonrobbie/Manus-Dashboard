import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@shared": path.resolve(__dirname, "../shared"),
      "@server": path.resolve(__dirname, "../server"),
      "@drizzle": path.resolve(__dirname, "../drizzle"),
      "@client": path.resolve(__dirname, "./src"),
      recharts: path.resolve(__dirname, "./src/vendor/recharts"),
    },
  },
  server: {
    port: 5173,
  },
  preview: {
    port: 4173,
    host: true,
    strictPort: true,
  },
});
