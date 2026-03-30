export default {
  testEnvironment: 'node',
  testMatch: ['**/tests/integration/**/*.test.js'],
  testTimeout: 30000,
  transform: { '^.+\\.js$': 'babel-jest' },
  setupFiles: ['./tests/helpers/setEnv.js'],
  setupFilesAfterEnv: ['./tests/helpers/silenceConsole.js'],
  collectCoverage: true,
  coverageDirectory: 'coverage/integration',

  collectCoverageFrom: [
    "controllers/**/*.js",
    "models/**/*.js",
    "middlewares/**/*.js",
    "helpers/**/*.js",
    "config/**/*.js",
    "!**/*.test.js",      
    "!**/testUtils/**",  
    "!**/node_modules/**"
  ],
};
