import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // No-op stub: see vitest.shims/server-only.ts for why.
      "server-only": path.resolve(__dirname, "./vitest.shims/server-only.ts"),
    },
  },
  test: {
    environment: "node",
    // scripts/**: one-time backfills carry their own co-located unit tests for
    // their PURE decision logic (arg parsing, plan/skip decisions). They must
    // run on the same bar as src/ — a backfill that can write to a live CRM is
    // exactly the code you do not want untested.
    include: ["src/**/*.test.ts", "src/**/*.test.tsx", "scripts/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts", "src/**/*.tsx"],
      exclude: ["src/**/*.test.ts", "src/**/*.test.tsx", "src/app/**"],
    },
  },
});
