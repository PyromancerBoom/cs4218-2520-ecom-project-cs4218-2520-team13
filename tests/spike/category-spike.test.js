// Lim Yik Seng, A0338506B
// Spike test: category browsing under promotion traffic.
// Fetches real category slugs from the server in setup(), then hits category and product endpoints at 400 VUs.

import http from "k6/http";
import { check, sleep } from "k6";
import { Counter, Rate } from "k6/metrics";
import { API_BASE, buildSpike, THRESHOLDS } from "./helpers/config.js";
import { randomPick } from "./helpers/generators.js";

const categoryErrors = new Counter("category_errors");
const productByCategoryErrors = new Counter("product_by_category_errors");
const errorRate = new Rate("category_spike_error_rate");

export const options = {
  stages: buildSpike(500, "10s"),
  thresholds: {
    ...THRESHOLDS.STANDARD,
    category_spike_error_rate: ["rate<0.02"],
  },
};

// Fetches category slugs from the server. Throws if server is down or no categories exist.
export function setup() {
  const res = http.get(`${API_BASE}/category/get-category`);

  if (res.status !== 200) {
    throw new Error(`[setup] GET /category/get-category failed with status ${res.status}. Is the server running?`);
  }

  const categories = res.json("category");

  if (!Array.isArray(categories) || categories.length === 0) {
    throw new Error("[setup] No categories found in database. Seed the database before running this test.");
  }

  const slugs = categories
    .filter((c) => c.slug)
    .map((c) => c.slug);

  console.log(`[setup] Loaded ${slugs.length} category slugs: ${slugs.join(", ")}`);

  return { slugs };
}

// Each VU picks a random category and browses its products. 50% also click into a product detail page.
export default function (data) {
  const { slugs } = data;
  const targetSlug = randomPick(slugs);

  // Step 1: Get all categories (triggers on every page load for navigation)
  const catListRes = http.get(`${API_BASE}/category/get-category`, {
    tags: { endpoint: "get_category" },
  });

  const catListOk = check(catListRes, {
    "get-category: status 200": (r) => r.status === 200,
  });
  errorRate.add(!catListOk);

  sleep(0.2);

  // Step 2: Get all products in the promoted category
  const productsRes = http.get(
    `${API_BASE}/product/product-category/${targetSlug}`,
    { tags: { endpoint: "product_category" } }
  );

  const productsOk = check(productsRes, {
    "product-category: status 200": (r) => r.status === 200,
    "product-category: has products array": (r) => {
      try {
        return Array.isArray(r.json("products"));
      } catch (_) {
        return false;
      }
    },
  });

  errorRate.add(!productsOk);
  if (!productsOk) productByCategoryErrors.add(1);

  // Step 3: 50% of users click into an individual product
  if (Math.random() < 0.5 && productsOk) {
    try {
      const products = productsRes.json("products");
      if (Array.isArray(products) && products.length > 0) {
        const product = randomPick(products);
        if (product.slug) {
          const productRes = http.get(
            `${API_BASE}/product/get-product/${product.slug}`,
            { tags: { endpoint: "single_product" } }
          );

          const productOk = check(productRes, {
            "single-product: status 200": (r) => r.status === 200,
          });

          if (!productOk) categoryErrors.add(1);

          sleep(0.5); // User reads product detail page
        }
      }
    } catch (_) {
      // If product detail fails, continue — not a critical path for this scenario
    }
  }

  sleep(Math.random() * 0.8 + 0.2);
}

export function teardown(data) {
  console.log(`[teardown] Category spike test complete. Tested slugs: ${data.slugs.join(", ")}`);
}
