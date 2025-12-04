import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Run test files sequentially since we're hitting a shared database
    fileParallelism: false,
    // Run tests within each file sequentially too
    sequence: {
      concurrent: false,
    },
    // Increase timeout for stress tests
    testTimeout: 30000,
    // Hook timeout for cleanup operations
    hookTimeout: 10000,
  },
});
