// Runs before each integration test file via jest setupFiles.
// Sets env vars that controllers and middleware depend on.
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-for-integration-tests';
// Stub Braintree vars so productController.js loads without crashing
process.env.BRAINTREE_MERCHANT_ID = 'test-merchant-id';
process.env.BRAINTREE_PUBLIC_KEY = 'test-public-key';
process.env.BRAINTREE_PRIVATE_KEY = 'test-private-key';
