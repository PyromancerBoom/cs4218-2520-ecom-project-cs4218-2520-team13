// Lim Yik Seng, A0338506B
// Spike test: checkout flow under concurrent load. Peaks at 150 VUs.
// Tests Braintree token endpoint by default.
// Payment is disabled by default because Braintree sandbox rate-limits concurrent transactions.
// Set ENABLE_PAYMENT_SPIKE=true to include payment testing.

import http from "k6/http";
import { check, sleep } from "k6";
import { Counter, Rate, Trend } from "k6/metrics";
import { API_BASE, JSON_HEADERS, SPIKE_STAGES, THRESHOLDS } from "./helpers/config.js";
import { createTestUsers, login, authHeaders } from "./helpers/auth.js";

const ENABLE_PAYMENT_SPIKE = __ENV.ENABLE_PAYMENT_SPIKE === "true";
const NUM_TEST_USERS = 20; // Lower count — checkout users are a subset of all users

const tokenErrors = new Counter("braintree_token_errors");
const paymentErrors = new Counter("payment_errors");
const tokenDuration = new Trend("braintree_token_duration", true);
const checkoutErrorRate = new Rate("checkout_error_rate");

export const options = {
  stages: SPIKE_STAGES.PAYMENT_SPIKE,
  thresholds: {
    ...THRESHOLDS.PAYMENT,
    checkout_error_rate: ["rate<0.02"], // Payment must be highly reliable
  },
};

// Creates 20 test users and pre-logs them in to build a token pool for VUs.
export function setup() {
  console.log(`[setup] Creating ${NUM_TEST_USERS} checkout test users...`);
  const credentials = createTestUsers(NUM_TEST_USERS, "checkoutspike");
  console.log(`[setup] Created ${credentials.length} users.`);

  // Pre-login all users to cache tokens
  const tokenPool = [];
  for (const cred of credentials) {
    const token = login(cred.email, cred.password);
    if (token) {
      tokenPool.push({ token, email: cred.email });
    }
  }

  console.log(`[setup] Pre-logged in ${tokenPool.length} users.`);
  console.log(`[setup] Payment spike enabled: ${ENABLE_PAYMENT_SPIKE}`);

  return { tokenPool };
}

// Each VU picks a token from the pool, gets a Braintree token, and optionally submits a payment.
export default function (data) {
  const { tokenPool } = data;

  if (tokenPool.length === 0) {
    console.warn("No tokens available — skipping iteration");
    sleep(1);
    return;
  }

  // Pick a random authenticated user from the pool
  const userAuth = tokenPool[Math.floor(Math.random() * tokenPool.length)];

  // Step 1: Get Braintree client token
  // This endpoint does NOT require auth (braintreeTokenController has no middleware),
  // but we tag it with auth headers anyway to mirror real browser behaviour
  const tokenRes = http.get(`${API_BASE}/product/braintree/token`, {
    tags: { endpoint: "braintree_token" },
  });

  tokenDuration.add(tokenRes.timings.duration);

  const tokenOk = check(tokenRes, {
    "braintree-token: status 200": (r) => r.status === 200,
    "braintree-token: returns clientToken": (r) => {
      try {
        return typeof r.json("clientToken") === "string";
      } catch (_) {
        return false;
      }
    },
  });

  checkoutErrorRate.add(!tokenOk);
  if (!tokenOk) tokenErrors.add(1);

  // Simulate user filling in payment details in the browser
  sleep(Math.random() * 1.5 + 0.5);

  // Step 2: Submit payment (only when ENABLE_PAYMENT_SPIKE is set)
  if (ENABLE_PAYMENT_SPIKE) {
    /**
     * In a real payment spike test:
     *   - nonce would come from Braintree JS SDK dropin UI
     *   - cart would contain real product ObjectIds from the database
     *
     * For sandbox testing, use Braintree test nonce: "fake-valid-nonce"
     * See: https://developer.paybraintree.com/reference/general/testing
     */
    // Product IDs from the seeded database (same as load test teammate used)
    const paymentPayload = {
      nonce: "fake-valid-nonce", // Braintree sandbox test nonce
      cart: [
        { _id: "66db427fdb0119d9234b27f1", price: 79.99, name: "Textbook" },
      ],
    };

    const paymentRes = http.post(
      `${API_BASE}/product/braintree/payment`,
      JSON.stringify(paymentPayload),
      {
        headers: authHeaders(userAuth.token),
        tags: { endpoint: "braintree_payment" },
      }
    );

    const paymentOk = check(paymentRes, {
      "payment: status 200 or 201": (r) =>
        r.status === 200 || r.status === 201,
      "payment: ok flag is true": (r) => {
        try {
          return r.json("ok") === true;
        } catch (_) {
          return false;
        }
      },
    });

    checkoutErrorRate.add(!paymentOk);
    if (!paymentOk) paymentErrors.add(1);

    sleep(1); // Post-payment confirmation page load time
  }
}

export function teardown(data) {
  console.log(
    `[teardown] Checkout spike test complete. ` +
    `Token pool size: ${data.tokenPool.length}. ` +
    `Payment testing was ${ENABLE_PAYMENT_SPIKE ? "ENABLED" : "DISABLED"}.`
  );
}
