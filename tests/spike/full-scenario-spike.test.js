// Lim Yik Seng, A0338506B
// Full spike test combining all 4 user archetypes simultaneously.
// Total peak: ~500 VUs (200 browsers + 150 searchers + 100 login + 50 shoppers).
// Tests how the system behaves when all endpoint types are under load at the same time.

import http from "k6/http";
import { check, sleep } from "k6";
import { Rate, Counter } from "k6/metrics";
import { API_BASE, JSON_HEADERS } from "./helpers/config.js";
import { createTestUsers, login } from "./helpers/auth.js";
import {
  randomPage,
  randomKeyword,
  randomPick,
  randomFilterPayload,
  getActualPageCount,
} from "./helpers/generators.js";

// Cross-archetype error tracking
const overallErrorRate = new Rate("overall_error_rate");
const archBrowserErrors = new Counter("arch_browser_errors");
const archSearchErrors = new Counter("arch_search_errors");
const archLoginErrors = new Counter("arch_login_errors");
const archShopperErrors = new Counter("arch_shopper_errors");

// --- Scenario options using k6 scenarios API ---
// Each scenario has independent VU scaling — this is more realistic
// than a single ramping-vus approach for mixed-traffic spikes.
export const options = {
  scenarios: {
    // Anonymous browsers — product listing and filtering
    anonymous_browsers: {
      executor: "ramping-vus",
      startVUs: 2,
      stages: [
        { duration: "30s", target: 10 },   // Baseline
        { duration: "5s", target: 200 },   // Spike
        { duration: "30s", target: 200 },  // Sustained
        { duration: "5s", target: 10 },    // Drop
        { duration: "20s", target: 10 },   // Recovery
      ],
      exec: "browserScenario",
      tags: { archetype: "browser" },
    },

    // Searchers — search endpoint spike
    searchers: {
      executor: "ramping-vus",
      startVUs: 1,
      stages: [
        { duration: "30s", target: 8 },
        { duration: "5s", target: 150 },
        { duration: "30s", target: 150 },
        { duration: "5s", target: 8 },
        { duration: "20s", target: 8 },
      ],
      exec: "searchScenario",
      tags: { archetype: "searcher" },
    },

    // Login surge — bcrypt-heavy concurrent logins
    login_surge: {
      executor: "ramping-vus",
      startVUs: 1,
      stages: [
        { duration: "30s", target: 5 },
        { duration: "5s", target: 100 },
        { duration: "30s", target: 100 },
        { duration: "5s", target: 5 },
        { duration: "20s", target: 5 },
      ],
      exec: "loginScenario",
      tags: { archetype: "login" },
    },

    // Authenticated shoppers — product detail + checkout token
    authenticated_shoppers: {
      executor: "ramping-vus",
      startVUs: 1,
      stages: [
        { duration: "30s", target: 3 },
        { duration: "5s", target: 50 },
        { duration: "30s", target: 50 },
        { duration: "5s", target: 3 },
        { duration: "20s", target: 3 },
      ],
      exec: "shopperScenario",
      tags: { archetype: "shopper" },
    },
  },

  thresholds: {
    // Overall system must not exceed 2% error rate
    overall_error_rate: ["rate<0.02"],
    // All requests combined: p(95) under 3 s
    http_req_duration: ["p(95)<3000"],
    // Failed requests across the whole run
    http_req_failed: ["rate<0.02"],
  },
};

// Creates login/shopper users, fetches category slugs and page count before the spike starts.
export function setup() {
  console.log("[setup] Creating test users for full scenario spike...");

  // Create users for login scenario
  const loginUsers = createTestUsers(30, "fullscenario_login");
  console.log(`[setup] Created ${loginUsers.length} login test users.`);

  // Create and pre-authenticate users for shopper scenario
  const shopperCreds = createTestUsers(15, "fullscenario_shopper");
  const shopperTokens = shopperCreds
    .map((c) => {
      const token = login(c.email, c.password);
      return token ? { token, email: c.email } : null;
    })
    .filter(Boolean);

  console.log(`[setup] Pre-authenticated ${shopperTokens.length} shopper users.`);

  // Fetch live category slugs for browser scenario
  const catRes = http.get(`${API_BASE}/category/get-category`);
  if (catRes.status !== 200) {
    throw new Error(`[setup] GET /category/get-category failed with status ${catRes.status}. Is the server running?`);
  }
  const cats = catRes.json("category");
  if (!Array.isArray(cats) || cats.length === 0) {
    throw new Error("[setup] No categories found in database. Seed the database before running this test.");
  }
  const categorySlugs = cats.filter((c) => c.slug).map((c) => c.slug);
  console.log(`[setup] Loaded ${categorySlugs.length} category slugs: ${categorySlugs.join(", ")}`);

  // Fetch actual page count for browser scenario
  const countRes = http.get(`${API_BASE}/product/product-count`);
  const pageCount = getActualPageCount(countRes);
  console.log(`[setup] Total pages available: ${pageCount}`);

  return { loginUsers, shopperTokens, categorySlugs, pageCount };
}

// Lim Yik Seng, A0338506B
// Archetype A: anonymous users browsing product listings, filters, and categories.
export function browserScenario(data) {
  const { categorySlugs, pageCount } = data;
  const page = randomPage(pageCount);

  // Load paginated product list
  const listRes = http.get(`${API_BASE}/product/product-list/${page}`, {
    tags: { endpoint: "product_list", archetype: "browser" },
  });

  const ok1 = check(listRes, {
    "browser: product-list 200": (r) => r.status === 200,
  });
  overallErrorRate.add(!ok1);
  if (!ok1) archBrowserErrors.add(1);

  sleep(0.3);

  // Apply a random price filter
  const filterRes = http.post(
    `${API_BASE}/product/product-filters`,
    JSON.stringify(randomFilterPayload()),
    {
      headers: JSON_HEADERS,
      tags: { endpoint: "product_filters", archetype: "browser" },
    }
  );

  const ok2 = check(filterRes, {
    "browser: product-filters 200": (r) => r.status === 200,
  });
  overallErrorRate.add(!ok2);
  if (!ok2) archBrowserErrors.add(1);

  // Browse a category if slugs are available
  if (categorySlugs.length > 0) {
    const slug = randomPick(categorySlugs);
    const catRes = http.get(`${API_BASE}/product/product-category/${slug}`, {
      tags: { endpoint: "product_category", archetype: "browser" },
    });
    const ok3 = check(catRes, { "browser: category-products 200": (r) => r.status === 200 });
    overallErrorRate.add(!ok3);
    if (!ok3) archBrowserErrors.add(1);
  }

  sleep(Math.random() * 0.8 + 0.2);
}

// Lim Yik Seng, A0338506B
// Archetype B: users searching for products by keyword.
export function searchScenario() {
  const keyword = randomKeyword();
  const res = http.get(
    `${API_BASE}/product/search/${encodeURIComponent(keyword)}`,
    { tags: { endpoint: "search", archetype: "searcher" } }
  );

  const ok = check(res, {
    "searcher: search 200": (r) => r.status === 200,
  });
  overallErrorRate.add(!ok);
  if (!ok) archSearchErrors.add(1);

  sleep(Math.random() * 1.0 + 0.3);
}

// Lim Yik Seng, A0338506B
// Archetype C: users logging in during the flash sale surge.
export function loginScenario(data) {
  const { loginUsers } = data;

  if (!loginUsers || loginUsers.length === 0) {
    sleep(1);
    return;
  }

  const cred = loginUsers[Math.floor(Math.random() * loginUsers.length)];

  const res = http.post(
    `${API_BASE}/auth/login`,
    JSON.stringify({ email: cred.email, password: cred.password }),
    {
      headers: { ...JSON_HEADERS, "x-loadtest-bypass": "true" },
      tags: { endpoint: "login", archetype: "login" },
    }
  );

  const ok = check(res, {
    "login: status 200": (r) => r.status === 200,
    "login: has token": (r) => {
      try { return typeof r.json("token") === "string"; } catch (_) { return false; }
    },
  });

  overallErrorRate.add(!ok);
  if (!ok) archLoginErrors.add(1);

  sleep(Math.random() * 0.5 + 0.2);
}

// Lim Yik Seng, A0338506B
// Archetype D: logged-in users browsing product details and getting a Braintree token.
export function shopperScenario(data) {
  const { shopperTokens } = data;

  if (!shopperTokens || shopperTokens.length === 0) {
    sleep(1);
    return;
  }

  // Browse products (auth not required for these endpoints)
  const listRes = http.get(`${API_BASE}/product/get-product`, {
    tags: { endpoint: "get_product", archetype: "shopper" },
  });

  const ok1 = check(listRes, {
    "shopper: get-product 200": (r) => r.status === 200,
  });
  overallErrorRate.add(!ok1);
  if (!ok1) archShopperErrors.add(1);

  // Look at an individual product if available
  try {
    const products = listRes.json("products");
    if (Array.isArray(products) && products.length > 0) {
      const product = randomPick(products);
      if (product.slug) {
        const detailRes = http.get(`${API_BASE}/product/get-product/${product.slug}`, {
          tags: { endpoint: "product_detail", archetype: "shopper" },
        });
        const detailOk = check(detailRes, { "shopper: product-detail 200": (r) => r.status === 200 });
        overallErrorRate.add(!detailOk);
        if (!detailOk) archShopperErrors.add(1);
        sleep(0.5); // Reading the product detail page
      }
    }
  } catch (_) {}

  // Initiate checkout — fetch Braintree token
  const tokenRes = http.get(`${API_BASE}/product/braintree/token`, {
    tags: { endpoint: "braintree_token", archetype: "shopper" },
  });

  const ok2 = check(tokenRes, {
    "shopper: braintree-token 200": (r) => r.status === 200,
  });
  overallErrorRate.add(!ok2);
  if (!ok2) archShopperErrors.add(1);

  sleep(Math.random() * 1.0 + 0.3);
}

export function teardown(data) {
  console.log(
    `[teardown] Full scenario spike complete. ` +
    `Login users: ${data.loginUsers.length}, ` +
    `Shopper tokens: ${data.shopperTokens.length}.`
  );
}
