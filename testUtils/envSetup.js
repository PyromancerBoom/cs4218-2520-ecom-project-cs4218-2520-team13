// dummy env braintree variables for testing
process.env.BRAINTREE_MERCHANT_ID = process.env.BRAINTREE_MERCHANT_ID || "test";
process.env.BRAINTREE_PUBLIC_KEY = process.env.BRAINTREE_PUBLIC_KEY || "test";
process.env.BRAINTREE_PRIVATE_KEY = process.env.BRAINTREE_PRIVATE_KEY || "test";

// ensure JWT_SECRET is always set in tests; authMiddleware.js has no fallback
process.env.JWT_SECRET = process.env.JWT_SECRET || "test-jwt-secret";
