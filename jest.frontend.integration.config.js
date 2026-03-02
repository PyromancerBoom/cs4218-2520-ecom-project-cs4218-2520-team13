// jest.frontend.integration.config.js
import base from './jest.frontend.config.js';

export default {
  ...base,
  testMatch: ['**/client/src/__tests__/integration/**/*.test.js'],
  testTimeout: 15000,
  // Override to remove the integration directory exclusion that the base adds for unit runs
  testPathIgnorePatterns: ['/node_modules/', '<rootDir>/client/src/_site/'],
  // jest-environment-jsdom defaults to customExportConditions:['browser'].
  // MSW's exports define "browser": null for its node subpath (explicit exclusion),
  // which causes Jest to fail resolution. Override to node conditions so MSW resolves correctly.
  testEnvironmentOptions: {
    customExportConditions: ['node', 'require', 'default'],
  },
  // CJS setup: CommonJS require() is synchronous so each global is set before the
  // next require() runs. This prevents undici from failing on missing TextDecoder/
  // ReadableStream/MessagePort when it initialises at module-evaluation time.
  setupFiles: [
    ...(base.setupFiles || []),
    '<rootDir>/client/src/__tests__/integration/globalSetup.cjs',
  ],
  // MSW's compiled CJS build requires 'until-async' which is pure ESM (v3).
  // Node's CJS require() cannot load ESM. Redirect to a hand-written CJS shim instead.
  moduleNameMapper: {
    ...base.moduleNameMapper,
    '^until-async$': '<rootDir>/client/src/__tests__/integration/__mocks__/until-async.js',
  },
};
