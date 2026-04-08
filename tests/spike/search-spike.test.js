// Lim Yik Seng, A0338506B
// Spike test: search endpoint under viral traffic surge.
// 70% of VUs search for a trending keyword, 30% use random terms. Peaks at 400 VUs.

import http from "k6/http";
import { check, sleep } from "k6";
import { Counter, Rate, Trend } from "k6/metrics";
import { API_BASE, buildSpike, THRESHOLDS } from "./helpers/config.js";
import { randomKeyword } from "./helpers/generators.js";

// The "viral" keyword that most VUs will search for — configurable via env
const TRENDING_KEYWORD = __ENV.TRENDING_KEYWORD || "laptop";

const searchErrors = new Counter("search_errors");
const searchDuration = new Trend("search_duration", true);
const searchErrorRate = new Rate("search_error_rate");

export const options = {
  stages: buildSpike(400, "10s"),
  thresholds: {
    ...THRESHOLDS.STANDARD,
    search_error_rate: ["rate<0.02"],
  },
};

// Each VU sends a search request with either the trending keyword or a random one.
export default function () {
  // 70% of traffic searches for the trending keyword, 30% organic
  const isTrending = Math.random() < 0.7;
  const keyword = isTrending ? TRENDING_KEYWORD : randomKeyword();

  const res = http.get(
    `${API_BASE}/product/search/${encodeURIComponent(keyword)}`,
    { tags: { endpoint: "search", keyword_type: isTrending ? "trending" : "organic" } }
  );

  searchDuration.add(res.timings.duration);

  const ok = check(res, {
    "search: status 200": (r) => r.status === 200,
    "search: returns results array": (r) => {
      try {
        return Array.isArray(r.json("results"));
      } catch (_) {
        return false;
      }
    },
  });

  searchErrorRate.add(!ok);
  if (!ok) searchErrors.add(1);

  // Simulate user pausing to read search results before the next search
  sleep(Math.random() * 1.0 + 0.3);
}
