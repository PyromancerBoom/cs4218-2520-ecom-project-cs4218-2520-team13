// Priyansh Bimbisariye, A0265903B

import http from "k6/http";
import { check, group, sleep } from "k6";
import { randomItem } from "https://jslib.k6.io/k6-utils/1.2.0/index.js";

import {
  BASE_URL,
  SEARCH_KEYWORDS,
  CATEGORY_SLUGS,
  CATEGORY_IDS,
  PRICE_RANGES,
} from "./helpers/config.js";
import { getPhase } from "./helpers/phases.js";
import {
  searchLatency,
  searchResponseSize,
  totalErrors,
} from "./helpers/metrics.js";

export const options = {
  scenarios: {
    searching: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "2m", target: 15 },
        { duration: "7m", target: 15 },
        { duration: "1m", target: 0 },
      ],
      gracefulRampDown: "30s",
      exec: "searchScenario",
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.02"],
    soak_search_latency: ["p(95)<2000", "p(99)<4000"],
    "soak_search_latency{phase:late}": ["p(95)<2500"],
    soak_total_errors: ["count<100"],
  },
};

// Priyansh Bimbisariye, A0265903B
export function searchScenario() {
  const phase = getPhase();

  // Priyansh Bimbisariye, A0265903B
  group("Soak_Search: Keyword Search", function () {
    const keyword = randomItem(SEARCH_KEYWORDS);
    const res = http.get(`${BASE_URL}/product/search/${keyword}`, {
      tags: { name: "Soak_Search", phase },
    });

    searchLatency.add(res.timings.duration, { phase });
    searchResponseSize.add(res.body ? res.body.length : 0, { phase });
    if (res.status !== 200) totalErrors.add(1);

    check(res, {
      "search returns 200": (r) => r.status === 200,
      "search returns success=true": (r) => {
        try {
          return r.json("success") === true;
        } catch (_e) {
          return false;
        }
      },
      "search response body < 1 MB": (r) =>
        (r.body ? r.body.length : 0) < 1048576,
    });
  });

  sleep(Math.random() * 2 + 1);

  // Priyansh Bimbisariye, A0265903B
  group("Soak_Search: Category Slug Filter", function () {
    const slug = randomItem(CATEGORY_SLUGS);
    const res = http.get(`${BASE_URL}/product/product-category/${slug}`, {
      tags: { name: "Soak_CategoryFilter", phase },
    });

    searchLatency.add(res.timings.duration, { phase });
    if (res.status !== 200) totalErrors.add(1);

    check(res, {
      "category filter returns 200": (r) => r.status === 200,
    });
  });

  sleep(Math.random() * 2 + 1);

  // Priyansh Bimbisariye, A0265903B
  group("Soak_Search: Price+Category Filter", function () {
    const selectedCategory = randomItem(CATEGORY_IDS);
    const selectedPrice = randomItem(PRICE_RANGES);

    const res = http.post(
      `${BASE_URL}/product/product-filters`,
      JSON.stringify({ checked: [selectedCategory], radio: selectedPrice }),
      {
        headers: { "Content-Type": "application/json" },
        tags: { name: "Soak_PriceFilter", phase },
      },
    );

    searchLatency.add(res.timings.duration, { phase });
    if (res.status !== 200) totalErrors.add(1);

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

  sleep(Math.random() * 3 + 2);
}
