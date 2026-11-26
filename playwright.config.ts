import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  timeout: 30_000,
  reporter: [
    ['list'],
    ['html', { open: 'never' }],
    ['json', { outputFile: 'test-results/results.json' }],
  ],
  use: {
    headless: true,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
    actionTimeout: 10_000,
    navigationTimeout: 30_000,
  },
  projects: [
    {
      name: 'chromium',
      testDir: './src/ui',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: process.env.BASE_URL ?? 'https://demo.playwright.dev/todomvc/',
      },
    },
    {
      name: 'firefox',
      testDir: './src/ui',
      use: {
        ...devices['Desktop Firefox'],
        baseURL: process.env.BASE_URL ?? 'https://demo.playwright.dev/todomvc/',
      },
    },
    {
      name: 'webkit',
      testDir: './src/ui',
      use: {
        ...devices['Desktop Safari'],
        baseURL: process.env.BASE_URL ?? 'https://demo.playwright.dev/todomvc/',
      },
    },
    {
      name: 'api',
      testDir: './src/api',
      use: {
        baseURL: process.env.API_BASE_URL ?? 'https://jsonplaceholder.typicode.com',
      },
    },
  ],
});
