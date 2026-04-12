// Priyansh Bimbisariye, A0265903B

// Combines browsing, search, checkout, and order history
// into a single mixed-workload soak test

import http from "k6/http";
import { check, group, sleep } from "k6";
import { SharedArray } from "k6/data";
import { Counter, Trend } from "k6/metrics";
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

// Tracks successful payments as a throughput metric visible in the K6 summary output
const paymentSuccesses = new Counter("soak_payment_successes");

// Tracks server heap usage over time, rising baseline across GC cycles = memory leak
const heapUsedTrend = new Trend("soak_heap_used_bytes");

const METRICS_POLL_INTERVAL = 10;

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

export const options = {
  scenarios: {
    // Simulates users browsing the storefront: homepage, photos, product detail
    browsing: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "2m", target: 25 }, // ramp up
        { duration: "26m", target: 25 }, // sustained load
        { duration: "2m", target: 0 },  // ramp down
      ],
      gracefulRampDown: "30s",
      exec: "browsingScenario",
    },

    // Simulates users running keyword searches and applying filters
    searching: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "2m", target: 20 },
        { duration: "26m", target: 20 },
        { duration: "2m", target: 0 },
      ],
      gracefulRampDown: "30s",
      exec: "searchScenario",
    },

    // Simulates users logging in and completing a purchase
    checkout: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "2m", target: 13 },
        { duration: "26m", target: 13 },
        { duration: "2m", target: 0 },
      ],
      gracefulRampDown: "30s",
      exec: "checkoutScenario",
    },

    // Simulates users logging in and reviewing their past orders
    orderHistory: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "2m", target: 7 },
        { duration: "26m", target: 7 },
        { duration: "2m", target: 0 },
      ],
      gracefulRampDown: "30s",
      exec: "orderHistoryScenario",
    },

    // 1 VU polling server memory every 15s
    // tracks V8 heap growth over the test duration
    // A rising baseline across GC cycles indicates a memory leak
    metrics: {
      executor: "ramping-vus",
      startVUs: 1,
      stages: [
        { duration: "2m", target: 1 },
        { duration: "26m", target: 1 },
        { duration: "2m", target: 1 },
      ],
      gracefulRampDown: "30s",
      exec: "metricsScenario",
    },
  },

  thresholds: {
    // these are adjusted for localhost

    // Max 0.5% error rate per endpoint
    // test fails if any endpoint degrades under sustained load
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

    // We will exlcude braintree endpoints from thresholds
    // external sandbox rate-limits concurrent transactions, causing expected failures unrelated
    // to system health. Payment throughput is visible via soak_payment_successes.

    "http_req_duration{name:Soak_ProductList}": ["p(95)<500"],
    "http_req_duration{name:Soak_Categories}": ["p(95)<500"],
    "http_req_duration{name:Soak_ProductCount}": ["p(95)<500"],
    "http_req_duration{name:Soak_ProductDetail}": ["p(95)<500"],
    "http_req_duration{name:Soak_Related}": ["p(95)<500"],
    "http_req_duration{name:Soak_Photo}": ["p(95)<1000"],
    "http_req_duration{name:Soak_Search}": ["p(95)<500"],
    "http_req_duration{name:Soak_CategoryFilter}": ["p(95)<500"],
    "http_req_duration{name:Soak_PriceFilter}": ["p(95)<500"],
    "http_req_duration{name:Soak_Login}": ["p(95)<1000", "p(99)<5000"],
    "http_req_duration{name:Soak_Orders}": ["p(95)<1000", "p(99)<5000"],

    "checks": ["rate>0.99"],
  },
};

// memory metrics polling
export function metricsScenario() {
  // Poll the server's own process.memoryUsage(), heap reported from inside the runtime
  // More reliable than OS-level tools since it isolates the Node process specifically
  const res = http.get(`${BASE_URL}/soak-test/metrics`, {
    tags: { name: "Soak_Metrics" },
  });

  const ok = check(res, {
    "metrics endpoint returns 200": (r) => r.status === 200,
  });

  if (ok) {
    try {
      const heapUsed = res.json("heapUsed");
      heapUsedTrend.add(heapUsed);

      check(res, {
        // Hard ceiling, 500MB heap on a small Express app suggests a serious leak
        "heap under 500MB": () => heapUsed < 500 * 1024 * 1024,
      });
    } catch (_e) {
      // truncated/malformed body
    }
  }

  sleep(METRICS_POLL_INTERVAL);
}

// ========================================================================
// Scenario 1: Browsing
// ========================================================================
// Priyansh Bimbisariye, A0265903B
export function browsingScenario() {
  // pick a random product for detail/related requests
  const selected = randomItem(DB_PRODUCTS); 

  group("Soak_Browse: Homepage Load", function () {
    const page = (Math.floor(Math.random() * 2) + 1).toString();

    // Batch sends all three homepage requests in parallel, matching browser behaviour
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

  group("Soak_Browse: Product Photos", function () {
    // first 3 products shown on page
    const photoProducts = DB_PRODUCTS.slice(0, 3); 

    // Batch photo requests in parallel
    const photoResponses = http.batch(
      photoProducts.map((p) => [
        "GET",
        `${BASE_URL}/product/product-photo/${p.pid}`,
        null,
        { tags: { name: "Soak_Photo" } },
      ]),
    );

    check(photoResponses[0], {
      // 404 is acceptable if the product has no photo... network errors are not
      "photo returns 200 or 404": (r) => r.status === 200 || r.status === 404,
    });
  });

  gaussianSleep(2, 0.5);

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

    // Related products use the same category — stresses the category index under concurrent load
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
      // guards against unbounded result growth
      "search body < 1 MB": (r) => (r.body ? r.body.length : 0) < 1048576,
    });
  });

  gaussianSleep(2, 0.5);

  group("Soak_Search: Category Filter", function () {
    // randomly pick a category each iteration
    const slug = randomItem(CATEGORY_SLUGS); 
    const res = http.get(`${BASE_URL}/product/product-category/${slug}`, {
      tags: { name: "Soak_CategoryFilter" },
    });

    check(res, {
      // 404 is valid if category exists but has no products
      //connection errors are not
      "category filter returns 200 or 404": (r) =>
        r.status === 200 || r.status === 404,
    });
  });

  gaussianSleep(2, 0.5);

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
  // pick a random test user each iteration
  const user = users[Math.floor(Math.random() * users.length)]; 

  gaussianSleep(2, 0.5);

  // login helper adds x-loadtest-bypass to avoid rate limiting
  const { res: loginRes, token } = login(user); 

  // Abort this iteration early if login fails — don't proceed to payment with no token
  if (loginRes.status !== 200 || !token) {
    sleep(3);
    return;
  }

  check(loginRes, {
    "login returns 200": (r) => r.status === 200,
    "login returns a non-empty token": () => !!token,
  });

  gaussianSleep(3, 0.75);

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

  group("Soak_Checkout: Payment", function () {
    // Build a random cart of 1–3 items to vary the payment amounts and order sizes
    const numItems = Math.floor(Math.random() * 3) + 1;
    const cart = [];
    for (let i = 0; i < numItems; i++) {
      const p = randomItem(DB_PRODUCTS);
      cart.push({ _id: p.pid, price: p.price, name: p.name });
    }

    const paymentRes = http.post(
      `${BASE_URL}/product/braintree/payment`,
      // rotate nonces across card types
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

  // Abort if login failed, order history requires a valid token
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
 
  // users check order history infrequently — long think time reflects this
  gaussianSleep(8, 2);
}
