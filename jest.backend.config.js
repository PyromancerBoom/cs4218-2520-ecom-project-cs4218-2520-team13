export default {
  // display name
  displayName: "backend",

  // when testing backend
  testEnvironment: "node",

  // which test to run
  testMatch: [
    "<rootDir>/helpers/authHelper.test.js",
    "<rootDir>/middlewares/authMiddleware.test.js",
    "<rootDir>/controllers/authController.test.js",
    "<rootDir>/controllers/categoryController.test.js",
  ],

  // jest code coverage
  collectCoverage: true,
  collectCoverageFrom: [
    "helpers/authHelper.js",
    "middlewares/authMiddleware.js",
    "controllers/authController.js",
    "controllers/categoryController.js",
  ],
  coverageThreshold: {
    global: {
      lines: 100,
      functions: 100,
    },
  },
};
