// Priyansh Bimbisariye, A0265903B
import http from "k6/http";
import { check, group, sleep } from "k6";
import { randomItem } from "https://jslib.k6.io/k6-utils/1.2.0/index.js";

import { BASE_URL, DB_PRODUCTS } from "./helpers/config.js";
import { getPhase } from "./helpers/phases.js";
import {
  browsingLatency,
  photoLatency,
  totalErrors,
} from "./helpers/metrics.js";

// Priyansh Bimbisariye, A0265903B
export const options = {
  scenarios: {
    browsing: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "2m", target: 20 },
        { duration: "7m", target: 20 },
        { duration: "1m", target: 0 },
      ],
      gracefulRampDown: "30s",
      exec: "browsingScenario",
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.02"],
    soak_browsing_latency: ["p(95)<2000", "p(99)<4000"],
    "soak_browsing_latency{phase:late}": ["p(95)<2500"],
    soak_photo_latency: ["p(95)<2000"],
    "soak_photo_latency{phase:late}": ["p(95)<2500"],
    soak_total_errors: ["count<100"],
  },
};

// Priyansh Bimbisariye, A0265903B
export function browsingScenario() {
  const phase = getPhase();
  const selected = randomItem(DB_PRODUCTS);

  // Priyansh Bimbisariye, A0265903B
  group("Soak_Browse: Homepage Load", function () {
    const page = (Math.floor(Math.random() * 2) + 1).toString();
    const responses = http.batch([
      [
        "GET",
        `${BASE_URL}/product/product-list/${page}`,
        null,
        { tags: { name: "Soak_ProductList", phase } },
      ],
      [
        "GET",
        `${BASE_URL}/category/get-category`,
        null,
        { tags: { name: "Soak_Categories", phase } },
      ],
      [
        "GET",
        `${BASE_URL}/product/product-count`,
        null,
        { tags: { name: "Soak_ProductCount", phase } },
      ],
    ]);

    responses.forEach((r) => {
      browsingLatency.add(r.timings.duration, { phase });
      if (r.status !== 200) totalErrors.add(1);
    });

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

  sleep(Math.random() * 2 + 1); // 1-3s think time

  // Priyansh Bimbisariye, A0265903B
  group("Soak_Browse: Product Photos", function () {
    const photoProducts = DB_PRODUCTS.slice(0, 3);
    const photoResponses = http.batch(
      photoProducts.map((p) => [
        "GET",
        `${BASE_URL}/product/product-photo/${p.pid}`,
        null,
        { tags: { name: "Soak_Photo", phase } },
      ]),
    );

    photoResponses.forEach((r) => {
      photoLatency.add(r.timings.duration, { phase });
      if (r.status !== 200 && r.status !== 404) totalErrors.add(1);
    });

    check(photoResponses[0], {
      "photo returns 200 or 404": (r) => r.status === 200 || r.status === 404,
    });
  });

  sleep(Math.random() * 2 + 1);

  // Priyansh Bimbisariye, A0265903B
  group("Soak_Browse: Product Detail", function () {
    const detailRes = http.get(
      `${BASE_URL}/product/get-product/${selected.slug}`,
      { tags: { name: "Soak_ProductDetail", phase } },
    );

    browsingLatency.add(detailRes.timings.duration, { phase });
    if (detailRes.status !== 200) totalErrors.add(1);

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
      { tags: { name: "Soak_Related", phase } },
    );

    browsingLatency.add(relatedRes.timings.duration, { phase });
    if (relatedRes.status !== 200) totalErrors.add(1);

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

  sleep(Math.random() * 3 + 2);
}
