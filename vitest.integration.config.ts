import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.integration.test.ts'],
    testTimeout: 30000, // 30s for OmniFocus operations
    hookTimeout: 60000, // 60s for setup/teardown
    // Per-file setup (initializes globalThis vars for each file)
    setupFiles: ['tests/integration/setup.ts'],
    // Global setup/teardown (runs ONCE before/after all tests)
    globalSetup: ['tests/integration/globalSetup.ts'],
    // Run sequentially - OmniFocus operations shouldn't overlap
    pool: 'forks',
    poolOptions: {
      forks: { singleFork: true }
    },
    // Ensure files run sequentially too
    fileParallelism: false,
    sequence: {
      shuffle: false
    }
  }
});
