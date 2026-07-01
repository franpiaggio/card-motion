import { defineConfig, devices } from '@playwright/test';

/**
 * One e2e suite, on purpose: the Balatro deal→play happy path. That flow is the
 * integration that repeatedly broke (StrictMode, the busy race, "no reparte"),
 * and it can only be caught in a real browser with real rAF — unit tests can't.
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  fullyParallel: true,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5180',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'pnpm exec vite --port 5180 --strictPort',
    url: 'http://localhost:5180',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
