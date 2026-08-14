// Integration (database) tests — ATLAS-017 RLS layer.
//
// SEPARATE from vitest.config.ts on purpose. The default suite is pure and
// DB-free so `pnpm test` stays fast and runnable anywhere; these tests need a
// live Supabase stack (Postgres + PostgREST + GoTrue) and run in their own CI
// job. Nothing here is picked up by the default run: different directory,
// different file suffix (`.itest.ts`), different config.

import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "server-only": path.resolve(__dirname, "./vitest.shims/server-only.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["tests/integration/**/*.itest.ts"],
    // Each file builds and tears down its own tenants/parents/children. Running
    // files sequentially keeps failures readable and avoids cross-file races on
    // the shared database.
    fileParallelism: false,
    // A cold `supabase start` plus real auth round-trips is slower than a unit
    // test; the default 5s timeout is not enough.
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
