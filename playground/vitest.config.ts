import { defineConfig } from 'vitest/config';

// Node env is enough — the poker logic is pure, no DOM.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
