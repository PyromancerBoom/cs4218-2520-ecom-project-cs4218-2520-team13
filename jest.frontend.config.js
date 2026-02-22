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
    "<rootDir>/client/src/context/**/*.test.js",
    "<rootDir>/client/src/components/Form/**/*.test.js",
    "<rootDir>/client/src/components/AdminMenu.test.js",
    "<rootDir>/client/src/hooks/**/*.test.js",
    "<rootDir>/client/src/pages/Categories.test.js",
    "<rootDir>/client/src/pages/Search.test.js",
    "<rootDir>/client/src/pages/admin/Users.test.js",
    "<rootDir>/client/src/pages/admin/AdminDashboard.test.js",
    "<rootDir>/client/src/pages/admin/CreateCategory*.test.js",
    "<rootDir>/client/src/components/Form/CategoryForm.test.js",
    "<rootDir>/client/src/pages/admin/CreateProduct.test.js",
    "<rootDir>/client/src/context/search.test.js",
    "<rootDir>/client/src/pages/user/Profile.test.js",
    "<rootDir>/client/src/pages/Auth/*.test.js",
    "<rootDir>/client/src/pages/admin/UpdateProduct.test.js",
  ],

  // jest code coverage
  collectCoverage: true,
  collectCoverageFrom: [
    "client/src/pages/Search.test.js",
    "client/src/pages/admin/Users.js",
    "client/src/pages/admin/CreateCategory.js",
    "client/src/components/Form/CategoryForm.js",
    "client/src/pages/Categories.js",
    "client/src/pages/Search.js",
    "client/src/pages/admin/CreateProduct.js",
    "client/src/context/search.js",
    "client/src/components/Form/SearchInput.js",
    "client/src/hooks/useCategory.js",
    "client/src/pages/user/Profile.js",
    "client/src/pages/Auth/**",
    "client/src/context/**",
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
