const { defineConfig } = require("@playwright/test");

module.exports = defineConfig({
  testDir: "./tests/e2e",
  timeout: 60000,
  expect: { timeout: 10000 },
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { browserName: "chromium" },
    },
  ],
  globalSetup: "./tests/setup/global-setup.js",
  globalTeardown: "./tests/setup/global-teardown.js",
  webServer: [
    {
      command:
        "npx cross-env MONGO_URL=mongodb://localhost:27017/ecommerce_e2e node server.js",
      port: 6060,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: "npm start --prefix ./client",
      url: "http://localhost:3000",
      reuseExistingServer: !process.env.CI,
    },
  ],
});
