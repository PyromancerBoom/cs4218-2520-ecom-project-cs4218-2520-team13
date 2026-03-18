import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false, // sequential to avoid DB conflicts between specs
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: [
    {
      command: 'cross-env NODE_ENV=production MONGO_URL=mongodb://localhost:27017/ecom-test node server.js',
      url: 'http://localhost:6060/api/v1/auth/user-auth',
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
    },
    {
      command: 'cross-env REACT_APP_API=http://localhost:6060 npm start --prefix client',
      url: 'http://localhost:3000',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
});
