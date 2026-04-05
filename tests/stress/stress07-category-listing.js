//Aashim Mahindroo, A0265890R

//Based on the directions of my user stories and testing methodology, Github Copilot generates initial test code for this file.
//Then I manually review the code and make necessary adjustments to ensure accuracy and relevance to the project requirements.

import http from "k6/http";
import { check, sleep } from "k6";
import { Rate, Trend, Counter, Gauge } from "k6/metrics";

const errorRate = new Rate("http_error_rate");

const responseTime = new Trend("category_listing_response_time", true);

const missingCategoryArray = new Counter("category_missing_array");

const emptyCategoryArray = new Counter("category_empty_array");

const categoryCount = new Gauge("category_count");

const successFlagFalse = new Counter("category_success_flag_false");

const BASE_URL = __ENV.BASE_URL || "http://localhost:6060";
const ENDPOINT  = `${BASE_URL}/api/v1/category/get-category`;

export function setup() {
  const res = http.get(ENDPOINT, { timeout: "15s" });

  if (res.status !== 200) {
    console.warn(
      `[setup] Could not fetch categories (status ${res.status}). ` +
      "Payload-size consistency check will be skipped."
    );
    return { expectedCount: null, expectedBodyLength: null };
  }

  let expectedCount = null;
  let expectedBodyLength = null;

  try {
    const body = JSON.parse(res.body);
    const cats = body.category;
    if (Array.isArray(cats)) {
      expectedCount      = cats.length;
      expectedBodyLength = res.body.length;
      console.log(
        `[setup] Baseline: ${expectedCount} categories, ` +
        `body length ${expectedBodyLength} bytes.`
      );
    }
  } catch {
    console.warn("[setup] Failed to parse baseline category response.");
  }

  return { expectedCount, expectedBodyLength };
}

export const options = {
  summaryTrendStats: ["avg", "min", "max", "p(90)", "p(95)", "p(99)"],

  stages: [
    { duration: "30s", target: 200 },
    { duration: "2m",  target: 200 },
    { duration: "20s", target: 0   },
  ],

  thresholds: {
    "category_missing_array": ["count==0"],

    "category_success_flag_false": ["count==0"],
  },
};

export default function (data) {
  const { expectedCount, expectedBodyLength } = data;

  const res = http.get(ENDPOINT, {
    tags: { endpoint: "category-listing" },
    timeout: "10s",
  });

  responseTime.add(res.timings.duration);
  errorRate.add(res.status < 200 || res.status >= 300);

  if (res.status === 200) {
    try {
      const body = JSON.parse(res.body);
      const cats = body.category;

      if (!Array.isArray(cats)) {
        missingCategoryArray.add(1);
      } else {
        categoryCount.add(cats.length);

        if (cats.length === 0) {
          emptyCategoryArray.add(1);
        }
      }

      if (body.success === false) {
        successFlagFalse.add(1);
      }
    } catch {
      
      missingCategoryArray.add(1);
    }
  }

  check(res, {
    
    "status is 200": (r) => r.status === 200,

    "response contains category array": (r) => {
      if (r.status !== 200) return true;
      try {
        return Array.isArray(JSON.parse(r.body).category);
      } catch {
        return false;
      }
    },

    "success flag is true": (r) => {
      if (r.status !== 200) return true;
      try {
        return JSON.parse(r.body).success === true;
      } catch {
        return false;
      }
    },

    "category count matches baseline": (r) => {
      if (r.status !== 200 || expectedCount === null) return true;
      try {
        const cats = JSON.parse(r.body).category;
        return Array.isArray(cats) && cats.length === expectedCount;
      } catch {
        return false;
      }
    },

    "payload size is consistent": (r) => {
      if (r.status !== 200 || expectedBodyLength === null) return true;
      const lower = expectedBodyLength * 0.95;
      const upper = expectedBodyLength * 1.05;
      return r.body.length >= lower && r.body.length <= upper;
    },

    "response body is non-empty": (r) => r.body && r.body.length > 0,

    "no transport error (status != 0)": (r) => r.status !== 0,
  });

  sleep(0.5);
}

export function handleSummary(data) {
  const metric = (name, valueKey) => {
    const m = data.metrics[name];
    return m !== undefined ? m.values[valueKey] : null;
  };

  const p95         = metric("category_listing_response_time", "p(95)");
  const reqFailed   = metric("http_req_failed",                 "rate");
  const totalReqs   = metric("http_reqs",                       "count");
  const missingArr  = metric("category_missing_array",      "count") ?? 0;
  const emptyArr    = metric("category_empty_array",        "count") ?? 0;
  const succFalse   = metric("category_success_flag_false", "count") ?? 0;
  const lastCount   = metric("category_count",              "value");

  const fmt = (v, d = 2) =>
    v !== null && v !== undefined ? Number(v).toFixed(d) : "N/A";

  console.log("\n==========================================");
  console.log("STRESS-07 — Category Listing Stress Test");
  console.log("==========================================");
  console.log(`Total requests sent          : ${fmt(totalReqs, 0)}`);
  console.log(`p95 response time            : ${fmt(p95)} ms  (informational)`);
  console.log(`Network failure rate         : ${reqFailed !== null ? (reqFailed * 100).toFixed(2) : "N/A"}%  (informational)`);
  console.log(`Missing category array       : ${fmt(missingArr, 0)}  (threshold: 0)`);
  console.log(`Empty category array (200s)  : ${fmt(emptyArr, 0)}  (expected: 0 in seeded env)`);
  console.log(`success:false on 200         : ${fmt(succFalse, 0)}  (threshold: 0)`);
  console.log(`Last observed category count : ${fmt(lastCount, 0)}`);
  console.log("------------------------------------------");

  const breaches = [];
  for (const [name, m] of Object.entries(data.metrics)) {
    if (!m.thresholds) continue;
    for (const [expr, result] of Object.entries(m.thresholds)) {
      if (!result.ok) {
        breaches.push(`  FAILED  [${name}] ${expr}`);
      }
    }
  }

  if (breaches.length === 0) {
    console.log("VERDICT: PASS — all acceptance criteria met.");
  } else {
    console.log("VERDICT: FAIL — the following thresholds were breached:");
    breaches.forEach((b) => console.log(b));
  }
  console.log("==========================================\n");

  return { stdout: "" };
}
