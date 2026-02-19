export default {
  // name displayed during tests
  displayName: "frontend",

  // simulates browser environment in jest
  // e.g., using document.querySelector in your tests
  testEnvironment: "jest-environment-jsdom",

  // jest does not recognise jsx files by default, so we use babel to transform any jsx files
  transform: {
    "^.+\\.jsx?$": "babel-jest",
  },

  // tells jest how to handle css/scss imports in your tests
  moduleNameMapper: {
    "\\.(css|scss)$": "identity-obj-proxy",
  },

  // ignore all node_modules except styleMock (needed for css imports)
  transformIgnorePatterns: ["/node_modules/(?!(styleMock\\.js)$)"],

  // run all frontend tests (exclude _site, which contains MarkBind-generated Vue files)
  testMatch: ["<rootDir>/client/src/**/*.test.js"],
  testPathIgnorePatterns: ["/node_modules/", "<rootDir>/client/src/_site/"],

  // jest code coverage
  collectCoverage: true,
  collectCoverageFrom: [
    "client/src/**/*.{js,jsx}",
    "!client/src/**/*.test.{js,jsx}",
    "!client/src/_site/**",
  ],
  setupFilesAfterEnv: ["<rootDir>/client/src/setupTests.js"],
};
