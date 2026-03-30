export default {
  // display name
  displayName: "backend",

  // when testing backend
  testEnvironment: "node",

  // set dummy env vars
  setupFiles: ["<rootDir>/testUtils/envSetup.js"],

  // which test to run - backend unit tests + backend integration tests in tests/integration/
  // excludes client/ (frontend, handled by jest.frontend.config.js)
  testMatch: ["<rootDir>/**/*.test.js"],
  testPathIgnorePatterns: ["/node_modules/", "<rootDir>/client/", "<rootDir>/tests/e2e/", "<rootDir>/tests/security/"],

  // jest code coverage
  collectCoverage: true,
  coverageDirectory: "coverage/backend",
  
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