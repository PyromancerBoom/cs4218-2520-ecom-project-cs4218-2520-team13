//Aashim Mahindroo, A0265890R

//Based on the directions of my user stories and testing methodology, Github Copilot generates initial test code for this file.
//Then I manually review the code and make necessary adjustments to ensure accuracy and relevance to the project requirements.

import http from "k6/http";
import { check, sleep } from "k6";
import { Rate, Trend, Counter } from "k6/metrics";

const errorRate = new Rate("http_error_rate");

const responseTime = new Trend("paginated_listing_response_time", true);

const responseTimePage1   = new Trend("paginated_listing_rt_page1",   true);
const responseTimePage2_5 = new Trend("paginated_listing_rt_page2_5", true);
const responseTimePage6_10= new Trend("paginated_listing_rt_page6_10",true);

const mongoTimeouts = new Counter("paginated_listing_mongo_timeouts");

const missingProductsArray = new Counter("paginated_listing_missing_array");

const serverErrorCount = new Counter("paginated_listing_server_errors_5xx");

export const options = {
  
  summaryTrendStats: ["avg", "min", "max", "p(90)", "p(95)", "p(99)"],

  stages: [
    { duration: "30s", target: 10  },
    { duration: "1m",  target: 100 },
    { duration: "2m",  target: 200 },
    { duration: "30s", target: 300 },
    { duration: "2m",  target: 300 },
    { duration: "30s", target: 0   },
  ],

  thresholds: {
    "paginated_listing_mongo_timeouts":    ["count==0"],

    "paginated_listing_server_errors_5xx": ["count<10"],

    "paginated_listing_missing_array":     ["count==0"],
  },
};

const BASE_URL = __ENV.BASE_URL || "http://localhost:6060";

const PAGE_WEIGHTS = [
  1, 1, 1, 1,   
  2, 3, 4, 5,   
  6, 7, 8, 9, 10, 
];

export default function () {
  const page = PAGE_WEIGHTS[Math.floor(Math.random() * PAGE_WEIGHTS.length)];
  const url  = `${BASE_URL}/api/v1/product/product-list/${page}`;

  const res = http.get(url, {
    tags: {
      endpoint: "product-list-paginated",
      page: String(page),
      tier:
        page === 1     ? "page1"    :
        page  <= 5     ? "page2_5"  :
                         "page6_10",
    },
    timeout: "15s",
  });

  responseTime.add(res.timings.duration);
  errorRate.add(res.status < 200 || res.status >= 300);

  if (page === 1) {
    responseTimePage1.add(res.timings.duration);
  } else if (page <= 5) {
    responseTimePage2_5.add(res.timings.duration);
  } else {
    responseTimePage6_10.add(res.timings.duration);
  }

  if (res.status >= 500) {
    serverErrorCount.add(1);

    if (res.body) {
      const lower = res.body.toLowerCase();
      if (
        lower.includes("cursor") ||
        lower.includes("mongotimeouterror") ||
        lower.includes("buffertimeout") ||
        lower.includes("queryexceededmemorylimit") ||
        lower.includes("timed out") ||
        lower.includes("casterror") ||
        lower.includes("topology") ||
        lower.includes("connection pool")
      ) {
        mongoTimeouts.add(1);
      }
    }
  }

  if (res.status === 200) {
    try {
      const body = JSON.parse(res.body);
      if (!Array.isArray(body.products)) {
        missingProductsArray.add(1);
      }
    } catch {
      missingProductsArray.add(1);
    }
  }

  check(res, {
    
    "status is 200": (r) => r.status === 200,

    "response contains products array": (r) => {
      if (r.status !== 200) return true;
      try {
        return Array.isArray(JSON.parse(r.body).products);
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

    "products array length <= 6": (r) => {
      if (r.status !== 200) return true;
      try {
        const arr = JSON.parse(r.body).products;
        return Array.isArray(arr) && arr.length <= 6;
      } catch {
        return false;
      }
    },

    "no 5xx server error": (r) => r.status < 500,

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

  const p95Overall   = metric("paginated_listing_response_time",    "p(95)");
  const p95Page1     = metric("paginated_listing_rt_page1",         "p(95)");
  const p95Page2_5   = metric("paginated_listing_rt_page2_5",       "p(95)");
  const p95Page6_10  = metric("paginated_listing_rt_page6_10",      "p(95)");
  const reqFailed    = metric("http_req_failed",                     "rate");
  const totalReqs    = metric("http_reqs",                           "count");

  const mongoTO      = metric("paginated_listing_mongo_timeouts",    "count") ?? 0;
  const missingArr   = metric("paginated_listing_missing_array",     "count") ?? 0;
  const serverErr    = metric("paginated_listing_server_errors_5xx", "count") ?? 0;

  const fmt = (v, d = 2) =>
    v !== null && v !== undefined ? Number(v).toFixed(d) : "N/A";

  let degradationNote = "Insufficient data for degradation analysis.";
  if (p95Page1 !== null && p95Page6_10 !== null) {
    const delta = p95Page6_10 - p95Page1;
    const ratio = p95Page1 > 0 ? (p95Page6_10 / p95Page1).toFixed(2) : "N/A";
    if (delta > 500) {
      degradationNote =
        `DEGRADATION DETECTED: page 6–10 p95 is ${fmt(delta, 0)} ms ` +
        `(${ratio}x) slower than page 1. ` +
        "Consider keyset/cursor-based pagination or MongoDB index covering sort field.";
    } else if (delta > 100) {
      degradationNote =
        `MILD DEGRADATION: page 6–10 p95 is ${fmt(delta, 0)} ms ` +
        `(${ratio}x) slower than page 1. Monitor as catalogue grows.`;
    } else {
      degradationNote =
        `NO SIGNIFICANT DEGRADATION: page 6–10 p95 is only ${fmt(delta, 0)} ms ` +
        `slower than page 1 (${ratio}x). Skip cost is negligible at current catalogue size.`;
    }
  }

  const thresholdBreached = p95Overall !== null && p95Overall > 5000;
  const errorRateBreached = reqFailed !== null && reqFailed > 0.10;

  let breakingPointNote;
  if (!thresholdBreached && !errorRateBreached) {
    breakingPointNote =
      "No breaking point reached within the test window. " +
      "System sustained all stages (up to 100 VUs) within thresholds.";
  } else {
    breakingPointNote =
      "Breaking point likely reached during the 100-VU stage (Stage 6). " +
      "Re-run with k6's --out influxdb or --out json and inspect the time-series " +
      "to pinpoint the exact VU count where p95 first exceeded 5000 ms or " +
      "error rate first exceeded 10%.";
    if (thresholdBreached) {
      breakingPointNote += ` Overall p95=${fmt(p95Overall)} ms.`;
    }
    if (errorRateBreached) {
      breakingPointNote += ` Failure rate=${(reqFailed * 100).toFixed(2)}%.`;
    }
  }

  console.log("\n==========================================");
  console.log("STRESS-09 — Paginated Listing Stress Test");
  console.log("==========================================");
  console.log(`Total requests sent              : ${fmt(totalReqs, 0)}`);
  console.log(`p95 overall response time        : ${fmt(p95Overall)} ms  (informational)`);
  console.log(`p95 page  1 only                 : ${fmt(p95Page1)} ms`);
  console.log(`p95 pages 2–5                    : ${fmt(p95Page2_5)} ms`);
  console.log(`p95 pages 6–10                   : ${fmt(p95Page6_10)} ms`);
  console.log(`Network failure rate             : ${reqFailed !== null ? (reqFailed * 100).toFixed(2) : "N/A"}%  (informational)`);
  console.log(`MongoDB cursor/timeout errors    : ${fmt(mongoTO, 0)}  (threshold: 0)`);
  console.log(`Missing products array (200s)    : ${fmt(missingArr, 0)}  (threshold: 0)`);
  console.log(`5xx server errors                : ${fmt(serverErr, 0)}  (threshold: < 10)`);
  console.log("------------------------------------------");
  console.log(`Pagination degradation: ${degradationNote}`);
  console.log("------------------------------------------");
  console.log(`Breaking point: ${breakingPointNote}`);
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
