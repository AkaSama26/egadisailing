import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    // Include unit (co-located in src/**) + integration (tests/integration/**)
    include: ["src/**/*.test.ts", "tests/**/*.test.ts"],
    setupFiles: ["tests/helpers/setup.ts"],
    // Integration test possono essere piu' lenti (Postgres startup, msw)
    testTimeout: 30_000,
    globals: false,
    // R26-P3: integration test condividono `egadisailing_test` Postgres DB
    // → truncate + create in parallelo cross-file causava constraint
    // violations. File-level sequential per integration/; unit test sono
    // pure functions quindi non regrediscono in perf significativa.
    fileParallelism: false,
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
});
