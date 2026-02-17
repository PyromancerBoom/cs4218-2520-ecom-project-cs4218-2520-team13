export default {
  // display name
  displayName: "backend",

  // when testing backend
  testEnvironment: "node",

  // which test to run - all backend tests, excluding client and node_modules
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
