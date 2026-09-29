import { defineConfig, devices } from '@playwright/test';

const base = process.env.VITE_BASE ?? '/Learning-Platform/';

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:4173${base}`,
    locale: 'th-TH',
    serviceWorkers: 'block',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'android-tablet', use: { ...devices['Galaxy Tab S4'] } },
    { name: 'phone', use: { ...devices['Pixel 7'] } },
    { name: 'ipad', use: { ...devices['iPad (gen 7)'] } },
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: `npm run build && npm run preview -- --port 4173 --strictPort`,
    url: `http://localhost:4173${base}`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
