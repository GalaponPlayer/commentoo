import { defineConfig } from 'vitest/config';

/**
 * Shared vitest base config for all @commentoo packages.
 * Each package extends this via `mergeConfig` in its own vitest.config.ts,
 * so test globs resolve relative to that package's directory.
 */
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
    // Placeholder packages have no tests yet; don't fail their `test` script.
    passWithNoTests: true,
  },
});
