// Lim Yik Seng, A0338506B
// Spike test: product browsing under flash sale load.
// Tests product listing, pagination, filters, and category endpoints at 500 VUs.

import http from "k6/http";
import { check, sleep } from "k6";
import { Counter, Rate, Trend } from "k6/metrics";
import { API_BASE, JSON_HEADERS, SPIKE_STAGES, THRESHOLDS } from "./helpers/config.js";
import { randomPage, randomFilterPayload, getActualPageCount } from "./helpers/generators.js";

// Custom metrics to track per-endpoint behaviour during the spike
const productListErrors = new Counter("product_list_errors");
const filterErrors = new Counter("filter_errors");
const productListDuration = new Trend("product_list_duration", true);
const errorRate = new Rate("custom_error_rate");

export const options = {
  stages: SPIKE_STAGES.SHARP_SPIKE,
  thresholds: THRESHOLDS.STANDARD,
};

// Fetches actual page count before the spike so VUs don't request non-existent pages.
export function setup() {
  const res = http.get(`${API_BASE}/product/product-count`);
  const pageCount = getActualPageCount(res);
  console.log(`[setup] Total pages available: ${pageCount}`);
  return { pageCount };
}

// Each VU simulates a user browsing products: list, count, filter, category.
export default function (data) {
  const page = randomPage(data.pageCount);

  // Step 1: Load the product listing page
  const listRes = http.get(`${API_BASE}/product/product-list/${page}`, {
    tags: { endpoint: "product_list" },
  });

  const listOk = check(listRes, {
    "product-list: status 200": (r) => r.status === 200,
    "product-list: returns array": (r) => {
      try {
        const body = r.json();
        return Array.isArray(body.products);
      } catch (_) {
        return false;
      }
    },
  });

  productListDuration.add(listRes.timings.duration);
  errorRate.add(!listOk);
  if (!listOk) productListErrors.add(1);

  // Brief pause — simulates user reading the product list before next action
  sleep(0.5);

  // Step 2: Fetch total product count (used by pagination UI)
  const countRes = http.get(`${API_BASE}/product/product-count`, {
    tags: { endpoint: "product_count" },
  });

  const countOk = check(countRes, {
    "product-count: status 200": (r) => r.status === 200,
    "product-count: has total": (r) => {
      try {
        return r.json("total") >= 0;
      } catch (_) {
        return false;
      }
    },
  });
  errorRate.add(!countOk);

  sleep(0.3);

  // Step 3: Apply a price filter (common behaviour during flash sales)
  const filterPayload = randomFilterPayload();
  const filterRes = http.post(
    `${API_BASE}/product/product-filters`,
    JSON.stringify(filterPayload),
    {
      headers: JSON_HEADERS,
      tags: { endpoint: "product_filters" },
    }
  );

  const filterOk = check(filterRes, {
    "product-filters: status 200": (r) => r.status === 200,
    "product-filters: returns products": (r) => {
      try {
        return Array.isArray(r.json("products"));
      } catch (_) {
        return false;
      }
    },
  });

  errorRate.add(!filterOk);
  if (!filterOk) filterErrors.add(1);

  sleep(0.5);

  // Step 4: Load category list (for the navigation sidebar)
  const catRes = http.get(`${API_BASE}/category/get-category`, {
    tags: { endpoint: "get_category" },
  });

  const catOk = check(catRes, {
    "get-category: status 200": (r) => r.status === 200,
  });
  errorRate.add(!catOk);

  // Random think time (0.2–1.0 s) between iterations — prevents perfectly
  // synchronised requests which would be unrealistic and artificially harsh
  sleep(Math.random() * 0.8 + 0.2);
}
