//Aashim Mahindroo, A0265890R

//Based on the directions of my user stories and testing methodology, Github Copilot generates initial test code for this file.
//Then I manually review the code and make necessary adjustments to ensure accuracy and relevance to the project requirements.


import http from "k6/http";
import { check, sleep } from "k6";
import { Trend, Counter } from "k6/metrics";

const responseTime = new Trend("product_filter_response_time", true);

const missingProductsArray = new Counter("missing_products_array");

const mongoErrors = new Counter("mongo_query_errors");

const serverErrors5xx = new Counter("filter_server_errors_5xx");

const PRICE_RANGES = [
  [],          
  [0, 19],
  [20, 39],
  [40, 59],
  [60, 79],
  [80, 99],
  [100, 9999],
];

const BASE_URL = __ENV.BASE_URL || "http://localhost:6060";

export function setup() {
  const res = http.get(`${BASE_URL}/api/v1/category/get-category`);
  if (res.status !== 200) {
    console.warn(
      `Could not fetch categories (status ${res.status}). ` +
      "Filters will use empty checked[] (no category filter)."
    );
    return { categoryIds: [] };
  }
  try {
    const body = JSON.parse(res.body);
    const ids = (body.category || []).map((c) => c._id);
    console.log(`Fetched ${ids.length} category IDs for filter combinations.`);
    return { categoryIds: ids };
  } catch {
    console.warn("Failed to parse category response. Using empty categoryIds.");
    return { categoryIds: [] };
  }
}

export const options = {
  summaryTrendStats: ["avg", "min", "max", "p(90)", "p(95)", "p(99)"],

  stages: [
    { duration: "30s", target: 150 },
    { duration: "2m",  target: 150 },
    { duration: "20s", target: 0   },
  ],

  thresholds: {

    "filter_server_errors_5xx": ["count<10"],

    "mongo_query_errors": ["count==0"],

    "missing_products_array": ["count==0"],
  },
};

function buildPayload(categoryIds) {
  const roll = Math.random();

  const randomCat = () =>
    categoryIds.length > 0
      ? [categoryIds[Math.floor(Math.random() * categoryIds.length)]]
      : [];

  const randomTwoCats = () => {
    if (categoryIds.length < 2) return randomCat();
    const shuffled = categoryIds.slice().sort(() => 0.5 - Math.random());
    return shuffled.slice(0, 2);
  };

  const randomPrice = () =>
    PRICE_RANGES[Math.floor(Math.random() * PRICE_RANGES.length)];

  if (roll < 0.25) {
    
    return { checked: randomCat(), radio: [] };
  } else if (roll < 0.50) {
    
    return { checked: [], radio: randomPrice() };
  } else if (roll < 0.75) {
    
    return { checked: randomCat(), radio: randomPrice() };
  } else if (roll < 0.90) {
    
    return { checked: randomTwoCats(), radio: [] };
  } else {
    
    return { checked: [], radio: [] };
  }
}

export default function (data) {
  const payload = buildPayload(data.categoryIds);

  const res = http.post(
    `${BASE_URL}/api/v1/product/product-filters`,
    JSON.stringify(payload),
    {
      headers: { "Content-Type": "application/json" },
      tags: { endpoint: "product-filters" },
      timeout: "10s",
    }
  );

  responseTime.add(res.timings.duration);
  if (res.status >= 500) serverErrors5xx.add(1);

  const isSuccess = res.status === 200;

  check(res, {
    
    "status is 200": (r) => r.status === 200,

    "response is valid JSON": (r) => {
      if (!isSuccess) return true;
      try { JSON.parse(r.body); return true; } catch { return false; }
    },
    "response contains products array": (r) => {
      if (!isSuccess) return true;
      try {
        return Array.isArray(JSON.parse(r.body).products);
      } catch { return false; }
    },
    "success flag is true": (r) => {
      if (!isSuccess) return true;
      try {
        return JSON.parse(r.body).success === true;
      } catch { return false; }
    },
    
    "response body is non-empty": (r) => r.body && r.body.length > 0,
  });

  if (isSuccess) {
    try {
      const body = JSON.parse(res.body);
      if (!Array.isArray(body.products)) {
        missingProductsArray.add(1);
      }
    } catch {
      missingProductsArray.add(1);
    }
  }

  if (!isSuccess && res.body) {
    const body = res.body.toLowerCase();
    if (
      body.includes("mongoerror") ||
      body.includes("castError") ||
      body.includes("buffertimeout") ||
      body.includes("connection pool") ||
      body.includes("topology") ||
      body.includes("timed out")
    ) {
      mongoErrors.add(1);
    }
  }

  sleep(0.5);
}

export function handleSummary(data) {
  const metric = (name, valueKey) => {
    const m = data.metrics[name];
    return m !== undefined ? m.values[valueKey] : null;
  };

  const p95           = metric("product_filter_response_time", "p(95)");
  const reqFailed     = metric("http_req_failed",              "rate");
  const totalReqs     = metric("http_reqs",                    "count");
  const mongoErrCount = metric("mongo_query_errors",           "count") ?? 0;
  const missingArr    = metric("missing_products_array",       "count") ?? 0;
  const serverErr5xx  = metric("filter_server_errors_5xx",     "count") ?? 0;

  const fmt = (v, d = 2) =>
    v !== null && v !== undefined ? Number(v).toFixed(d) : "N/A";

  console.log("\n==========================================");
  console.log("STRESS-03 — Product Filter Stress Test");
  console.log("==========================================");
  console.log(`Total requests sent        : ${fmt(totalReqs, 0)}`);
  console.log(`p95 response time          : ${fmt(p95)} ms  (informational)`);
  console.log(`k6 http_req_failed rate    : ${reqFailed !== null ? (reqFailed * 100).toFixed(2) : "N/A"}%  (informational — timeouts expected under stress)`);
  console.log(`Server 5xx errors          : ${fmt(serverErr5xx, 0)}  (threshold: < 10)`);
  console.log(`MongoDB query errors       : ${fmt(mongoErrCount, 0)}  (threshold: 0)`);
  console.log(`Missing products array     : ${fmt(missingArr, 0)}  (threshold: 0)`);
  console.log("------------------------------------------");

  const breaches = [];
  for (const [name, metric] of Object.entries(data.metrics)) {
    if (!metric.thresholds) continue;
    for (const [expr, result] of Object.entries(metric.thresholds)) {
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
