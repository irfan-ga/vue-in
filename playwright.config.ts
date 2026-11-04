import process from 'node:process'
import { defineConfig, devices } from '@playwright/test'

/** See https://playwright.dev/docs/test-configuration. */
export default defineConfig({
  testDir: './e2e',
  timeout: 30 * 1000,
  expect: {
    timeout: 5000,
  },

  // A stray `test.only` passes locally and silently skips the rest on CI.
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',

  use: {
    actionTimeout: 0,
    baseURL: process.env.CI ? 'http://localhost:4173' : 'http://localhost:5173',
    trace: 'on-first-retry',
    headless: !!process.env.CI,
  },

  /*
   * CI runs chromium only on pull requests and all three on main — see
   * .github/workflows/ci.yml and rule 31. The full matrix is too slow for the
   * gate, and a gate that is too slow gets skipped.
   */
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],

  /*
   * Dev server locally for the faster feedback loop, preview build on CI for a
   * realistic one. MSW serves the API in both — it is the development backend
   * (ADR 0004), so `VITE_ENABLE_MSW` is not tied to `import.meta.env.DEV`.
   */
  webServer: {
    command: process.env.CI ? 'pnpm preview' : 'pnpm dev',
    port: process.env.CI ? 4173 : 5173,
    reuseExistingServer: !process.env.CI,
  },
})
