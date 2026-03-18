export default {
  // display name
  displayName: "backend",

  // when testing backend
  testEnvironment: "node",

  // set dummy env vars
  setupFiles: ["<rootDir>/testUtils/envSetup.js"],

  // which test to run - all backend tests, excluding client, node_modules,
  // and tests/integration (those run via jest.integration.config.js)
  testMatch: ["<rootDir>/**/*.test.js"],
  testPathIgnorePatterns: ["/node_modules/", "<rootDir>/client/", "<rootDir>/tests/"],

  // jest code coverage
  collectCoverage: true,
  collectCoverageFrom: [
    "controllers/**",
    "models/**",
    "middlewares/**",
    "helpers/**",
    "config/**",
  ],
  coverageThreshold: {
    global: {
      lines: 100,
      functions: 100,
    },
  },
};
