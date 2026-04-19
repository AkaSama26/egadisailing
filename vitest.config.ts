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
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
});
