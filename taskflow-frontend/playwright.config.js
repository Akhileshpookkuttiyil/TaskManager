import { defineConfig, devices } from '@playwright/test';

/**
 * TaskFlow Playwright End-to-End Test Configuration
 * Configured for Chromium browser automation in headless and headed modes.
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 60000,
  expect: {
    timeout: 10000,
  },
  fullyParallel: false,
  workers: 1, // Single worker avoids Neon DB connection exhaustion and race conditions
  retries: process.env.CI ? 2 : 1,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:5173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    headless: true,
    actionTimeout: 15000,
    navigationTimeout: 20000,
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
      },
    },
  ],
  webServer: [
    {
      command: 'npm start',
      cwd: '../taskflow-backend',
      url: 'http://localhost:5000/',
      reuseExistingServer: true,
      timeout: 30000,
    },
    {
      command: 'npm run dev',
      cwd: '.',
      url: 'http://localhost:5173/',
      reuseExistingServer: true,
      timeout: 30000,
    },
  ],
});
