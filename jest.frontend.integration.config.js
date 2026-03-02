// jest.frontend.integration.config.js
import base from './jest.frontend.config.js';

export default {
  ...base,
  testMatch: ['**/client/src/__tests__/integration/**/*.test.js'],
  testTimeout: 15000,
};
