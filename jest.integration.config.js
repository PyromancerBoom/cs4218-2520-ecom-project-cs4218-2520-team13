// LOW WEI SHENG, A0259272X
// jest.integration.config.js
export default {
  testEnvironment: 'node',
  testMatch: ['**/tests/integration/**/*.test.js'],
  testTimeout: 30000,
  transform: { '^.+\\.js$': 'babel-jest' },
  setupFiles: ['./tests/helpers/setEnv.js'],
  setupFilesAfterEnv: ['./tests/helpers/silenceConsole.js'],
};
