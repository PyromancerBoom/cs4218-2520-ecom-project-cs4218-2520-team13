// Priyansh Bimbisariye, A0265903B

// Combines browsing, search, checkout, and order history
// into a single mixed-workload soak test

import http from "k6/http";
import { check, group, sleep } from "k6";
import { SharedArray } from "k6/data";
import { Counter } from "k6/metrics";
import { randomItem } from "https://jslib.k6.io/k6-utils/1.2.0/index.js";

import {
  BASE_URL,
  DB_PRODUCTS,
  SEARCH_KEYWORDS,
  CATEGORY_SLUGS,
  CATEGORY_IDS,
  PRICE_RANGES,
  VALID_NONCES,
} from "./helpers/config.js";
import { login } from "./helpers/auth.js";

// Counter for post-run DB validation (compared against actual order count)
const paymentSuccesses = new Counter("soak_payment_successes");

// shared test data loaded once and shared across all VUs
const users = new SharedArray("soak_users", function () {
  return open("./users.csv")
    .split("\n")
    .slice(1)
    .map((line) => {
      const parts = line.split(",");
      return { email: parts[1]?.trim(), password: parts[2]?.trim() };
    })
    .filter((u) => u.email && u.password);
});

function gaussianSleep(mean, stddev) {
  const u1 = Math.random();
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  sleep(Math.max(0.5, mean + z * stddev));
}

// k6 configs
export const options = {
  scenarios: {
    browsing: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "2m", target: 25 },
        { duration: "30m", target: 25 },
        { duration: "2m", target: 0 },
      ],
      gracefulRampDown: "30s",
      exec: "browsingScenario",
    },

    searching: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "2m", target: 20 },
        { duration: "30m", target: 20 },
        { duration: "2m", target: 0 },
      ],
      gracefulRampDown: "30s",
      exec: "searchScenario",
    },

    checkout: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "2m", target: 13 },
        { duration: "30m", target: 13 },
        { duration: "2m", target: 0 },
      ],
      gracefulRampDown: "30s",
      exec: "checkoutScenario",
    },

    orderHistory: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "2m", target: 7 },
        { duration: "30m", target: 7 },
        { duration: "2m", target: 0 },
      ],
      gracefulRampDown: "30s",
      exec: "orderHistoryScenario",
    },
  },

  thresholds: {
    // Global error rate excludes Braintree endpoints (external sandbox has rate limiting)
    "http_req_failed{name:Soak_ProductList}": ["rate<0.005"],
    "http_req_failed{name:Soak_Categories}": ["rate<0.005"],
    "http_req_failed{name:Soak_ProductCount}": ["rate<0.005"],
    "http_req_failed{name:Soak_ProductDetail}": ["rate<0.005"],
    "http_req_failed{name:Soak_Related}": ["rate<0.005"],
    "http_req_failed{name:Soak_Photo}": ["rate<0.005"],
    "http_req_failed{name:Soak_Search}": ["rate<0.005"],
    "http_req_failed{name:Soak_CategoryFilter}": ["rate<0.005"],
    "http_req_failed{name:Soak_PriceFilter}": ["rate<0.005"],
    "http_req_failed{name:Soak_Login}": ["rate<0.005"],
    "http_req_failed{name:Soak_Orders}": ["rate<0.005"],

    // Braintree endpoints excluded from thresholds — external sandbox
    // rate-limits concurrent transactions. Payment correctness is verified
    // by the post-run DB integrity check instead.

    // Per-endpoint latency
    "http_req_duration{name:Soak_ProductList}": ["p(95)<500"],
    "http_req_duration{name:Soak_Categories}": ["p(95)<500"],
    "http_req_duration{name:Soak_ProductCount}": ["p(95)<500"],
    "http_req_duration{name:Soak_ProductDetail}": ["p(95)<500"],
    "http_req_duration{name:Soak_Related}": ["p(95)<500"],
    "http_req_duration{name:Soak_Photo}": ["p(95)<1000"],
    "http_req_duration{name:Soak_Search}": ["p(95)<500"],
    "http_req_duration{name:Soak_CategoryFilter}": ["p(95)<500"],
    "http_req_duration{name:Soak_PriceFilter}": ["p(95)<500"],
    "http_req_duration{name:Soak_Login}": ["p(95)<1000"],
    "http_req_duration{name:Soak_Orders}": ["p(95)<1000"],
  },
};

// ========================================================================
// Scenario 1: Browsing
// ========================================================================
// Priyansh Bimbisariye, A0265903B
export function browsingScenario() {
  const selected = randomItem(DB_PRODUCTS);

  // Priyansh Bimbisariye, A0265903B
  group("Soak_Browse: Homepage Load", function () {
    const page = (Math.floor(Math.random() * 2) + 1).toString();
    const responses = http.batch([
      [
        "GET",
        `${BASE_URL}/product/product-list/${page}`,
        null,
        { tags: { name: "Soak_ProductList" } },
      ],
      [
        "GET",
        `${BASE_URL}/category/get-category`,
        null,
        { tags: { name: "Soak_Categories" } },
      ],
      [
        "GET",
        `${BASE_URL}/product/product-count`,
        null,
        { tags: { name: "Soak_ProductCount" } },
      ],
    ]);

    check(responses[0], {
      "product-list returns 200": (r) => r.status === 200,
      "product-list has success=true": (r) => {
        try {
          return r.json("success") === true;
        } catch (_e) {
          return false;
        }
      },
    });
    check(responses[1], { "categories returns 200": (r) => r.status === 200 });
    check(responses[2], {
      "product-count returns 200": (r) => r.status === 200,
    });
  });

  gaussianSleep(2, 0.5);

  // Priyansh Bimbisariye, A0265903B
  group("Soak_Browse: Product Photos", function () {
    const photoProducts = DB_PRODUCTS.slice(0, 3);
    const photoResponses = http.batch(
      photoProducts.map((p) => [
        "GET",
        `${BASE_URL}/product/product-photo/${p.pid}`,
        null,
        { tags: { name: "Soak_Photo" } },
      ]),
    );

    check(photoResponses[0], {
      "photo returns 200 or 404": (r) => r.status === 200 || r.status === 404,
    });
  });

  gaussianSleep(2, 0.5);

  // Priyansh Bimbisariye, A0265903B
  group("Soak_Browse: Product Detail", function () {
    const detailRes = http.get(
      `${BASE_URL}/product/get-product/${selected.slug}`,
      { tags: { name: "Soak_ProductDetail" } },
    );

    check(detailRes, {
      "product detail returns 200": (r) => r.status === 200,
      "product detail has a product object": (r) => {
        try {
          const body = r.json();
          return (
            body && body.success === true && body.product && body.product.name
          );
        } catch (_e) {
          return false;
        }
      },
    });

    sleep(0.5);

    const relatedRes = http.get(
      `${BASE_URL}/product/related-product/${selected.pid}/${selected.cid}`,
      { tags: { name: "Soak_Related" } },
    );

    check(relatedRes, {
      "related products returns 200": (r) => r.status === 200,
      "related products has success=true": (r) => {
        try {
          return r.json("success") === true;
        } catch (_e) {
          return false;
        }
      },
    });
  });

  gaussianSleep(3, 1);
}

// ========================================================================
// Scenario 2: Search and filters
// ========================================================================
// Priyansh Bimbisariye, A0265903B
export function searchScenario() {
  // Priyansh Bimbisariye, A0265903B
  group("Soak_Search: Keyword Search", function () {
    const keyword = randomItem(SEARCH_KEYWORDS);
    const res = http.get(`${BASE_URL}/product/search/${keyword}`, {
      tags: { name: "Soak_Search" },
    });

    check(res, {
      "search returns 200": (r) => r.status === 200,
      "search returns success=true": (r) => {
        try {
          return r.json("success") === true;
        } catch (_e) {
          return false;
        }
      },
      "search results is array": (r) => {
        try {
          return Array.isArray(r.json("results"));
        } catch (_e) {
          return false;
        }
      },
      "search body < 1 MB": (r) => (r.body ? r.body.length : 0) < 1048576,
    });
  });

  gaussianSleep(2, 0.5);

  // Priyansh Bimbisariye, A0265903B
  group("Soak_Search: Category Filter", function () {
    const slug = randomItem(CATEGORY_SLUGS);
    const res = http.get(`${BASE_URL}/product/product-category/${slug}`, {
      tags: { name: "Soak_CategoryFilter" },
    });

    check(res, {
      "category filter returns 200 or 404": (r) =>
        r.status === 200 || r.status === 404,
    });
  });

  gaussianSleep(2, 0.5);

  // Priyansh Bimbisariye, A0265903B
  group("Soak_Search: Price+Category Filter", function () {
    const selectedCategory = randomItem(CATEGORY_IDS);
    const selectedPrice = randomItem(PRICE_RANGES);

    const res = http.post(
      `${BASE_URL}/product/product-filters`,
      JSON.stringify({ checked: [selectedCategory], radio: selectedPrice }),
      {
        headers: { "Content-Type": "application/json" },
        tags: { name: "Soak_PriceFilter" },
      },
    );

    check(res, {
      "price filter returns 200": (r) => r.status === 200,
      "price filter returns success=true": (r) => {
        try {
          return r.json("success") === true;
        } catch (_e) {
          return false;
        }
      },
    });
  });

  gaussianSleep(3, 1);
}

// ========================================================================
// Scenario 3: Checkout
// ========================================================================
// Priyansh Bimbisariye, A0265903B
export function checkoutScenario() {
  const user = users[Math.floor(Math.random() * users.length)];

  gaussianSleep(2, 0.5);

  const { res: loginRes, token } = login(user);

  if (loginRes.status !== 200 || !token) {
    sleep(3);
    return;
  }

  check(loginRes, {
    "login returns 200": (r) => r.status === 200,
    "login returns a non-empty token": () => !!token,
  });

  gaussianSleep(3, 0.75);

  // Priyansh Bimbisariye, A0265903B
  group("Soak_Checkout: Braintree Token", function () {
    const tokenRes = http.get(`${BASE_URL}/product/braintree/token`, {
      tags: { name: "Soak_BraintreeToken" },
    });

    check(tokenRes, {
      "braintree token returns 200": (r) => r.status === 200,
      "braintree token is non-empty": (r) => r.body && r.body.length > 0,
    });
  });

  gaussianSleep(2, 0.5);

  // Priyansh Bimbisariye, A0265903B
  group("Soak_Checkout: Payment", function () {
    const numItems = Math.floor(Math.random() * 3) + 1;
    const cart = [];
    for (let i = 0; i < numItems; i++) {
      const p = randomItem(DB_PRODUCTS);
      cart.push({ _id: p.pid, price: p.price, name: p.name });
    }

    const paymentRes = http.post(
      `${BASE_URL}/product/braintree/payment`,
      JSON.stringify({ nonce: randomItem(VALID_NONCES), cart }),
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: token,
        },
        tags: { name: "Soak_Payment" },
      },
    );

    const paymentOk = check(paymentRes, {
      "payment returns 200": (r) => r.status === 200,
      "payment ok=true": (r) => {
        try {
          return r.json("ok") === true;
        } catch (_e) {
          return false;
        }
      },
    });

    if (paymentOk) paymentSuccesses.add(1);
  });

  gaussianSleep(5, 1.5);
}

// ========================================================================
// Scenario 4: Order history
// ========================================================================
// Priyansh Bimbisariye, A0265903B
export function orderHistoryScenario() {
  const user = users[Math.floor(Math.random() * users.length)];

  const { res: loginRes, token } = login(user);

  if (loginRes.status !== 200 || !token) {
    sleep(5);
    return;
  }

  sleep(1);

  // Priyansh Bimbisariye, A0265903B
  group("Soak_Orders: Fetch order history", function () {
    const res = http.get(`${BASE_URL}/auth/orders`, {
      headers: { Authorization: token },
      tags: { name: "Soak_Orders" },
    });

    check(res, {
      "orders returns 200": (r) => r.status === 200,
      "orders is valid JSON": (r) => {
        try {
          JSON.parse(r.body);
          return true;
        } catch (_e) {
          return false;
        }
      },
      "orders response < 500 KB": (r) => (r.body ? r.body.length : 0) < 512000,
    });
  });

  gaussianSleep(8, 2);
}
