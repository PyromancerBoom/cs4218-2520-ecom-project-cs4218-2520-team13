// tests/helpers/setEnv.js
// Runs before each integration test file via jest setupFiles.
// Sets env vars that controllers and middleware depend on.
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-for-integration-tests';
