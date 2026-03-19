export default {
  // display name
  displayName: "backend",

  // when testing backend
  testEnvironment: "node",

  // which test to run - backend unit tests + backend integration tests in tests/integration/
  // excludes client/ (frontend, handled by jest.frontend.config.js)
  testMatch: ["<rootDir>/**/*.test.js"],
  testPathIgnorePatterns: ["/node_modules/", "<rootDir>/client/"],

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
