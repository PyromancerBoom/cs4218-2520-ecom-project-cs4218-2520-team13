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

  // only run these tests
  testMatch: [
    "<rootDir>/client/src/components/AdminMenu.test.js",
    "<rootDir>/client/src/components/Form/CategoryForm.test.js",
    "<rootDir>/client/src/context/auth.test.js",
    "<rootDir>/client/src/pages/Auth/Login.test.js",
    "<rootDir>/client/src/pages/Auth/Register.test.js",
    "<rootDir>/client/src/pages/admin/AdminDashboard.test.js",
    "<rootDir>/client/src/pages/admin/CreateCategory*.test.js",
    "<rootDir>/client/src/pages/admin/CreateProduct.test.js",
    "<rootDir>/client/src/pages/admin/UpdateProduct.test.js",
  ],

  // jest code coverage
  collectCoverage: true,
  collectCoverageFrom: [
    "client/src/components/AdminMenu.js",
    "client/src/components/Form/CategoryForm.js",
    "client/src/context/auth.js",
    "client/src/pages/Auth/Login.js",
    "client/src/pages/Auth/Register.js",
    "client/src/pages/admin/AdminDashboard.js",
    "client/src/pages/admin/CreateCategory.js",
    "client/src/pages/admin/CreateProduct.js",
    "client/src/pages/admin/UpdateProduct.js",
  ],
  coverageThreshold: {
    global: {
      lines: 100,
      functions: 100,
    },
  },
  setupFilesAfterEnv: ["<rootDir>/client/src/setupTests.js"],
};
