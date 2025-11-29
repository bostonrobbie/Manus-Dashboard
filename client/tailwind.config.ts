import type { Config } from "tailwindcss";
import path from "path";
export default {
  content: [path.join(__dirname, "./index.html"), path.join(__dirname, "./src/**/*.{ts,tsx}")],
  theme: {
    extend: {
      colors: {
        border: "#e2e8f0",
        background: "#f8fafc",
        card: "#ffffff",
        muted: {
          DEFAULT: "#f1f5f9",
          foreground: "#64748b",
        },
        success: "#16a34a",
        warning: "#f59e0b",
        destructive: "#dc2626",
      },
    },
  },
  plugins: [],
} satisfies Config;
