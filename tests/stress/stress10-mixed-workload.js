//Aashim Mahindroo, A0265890R

//Based on the directions of my user stories and testing methodology, Github Copilot generates initial test code for this file.
//Then I manually review the code and make necessary adjustments to ensure accuracy and relevance to the project requirements.

import http from "k6/http";
import { check, sleep } from "k6";
import { Rate, Trend, Counter } from "k6/metrics";

const overallErrorRate = new Rate("mixed_overall_error_rate");

const overallResponseTime = new Trend("mixed_overall_response_time", true);

const browseErrorRate   = new Rate("mixed_err_browse");
const filterErrorRate   = new Rate("mixed_err_filter");
const searchErrorRate   = new Rate("mixed_err_search");
const categoryErrorRate = new Rate("mixed_err_category");
const loginErrorRate    = new Rate("mixed_err_login");
const ordersErrorRate   = new Rate("mixed_err_orders");

const browseRT   = new Trend("mixed_rt_browse",   true);
const filterRT   = new Trend("mixed_rt_filter",   true);
const searchRT   = new Trend("mixed_rt_search",   true);
const categoryRT = new Trend("mixed_rt_category", true);
const loginRT    = new Trend("mixed_rt_login",    true);
const ordersRT   = new Trend("mixed_rt_orders",   true);

const ttfbTrend = new Trend("mixed_ttfb_waiting", true);

const serverErrors = new Counter("mixed_server_errors_5xx");

const KEYWORDS = [
  "phone", "laptop", "book", "shirt", "camera",
  "watch", "headphone", "tablet", "shoe", "bag",
  "wireless", "portable", "premium", "vintage", "compact",
  "a", "e",
  "LAPTOP", "Phone",
  "zzzznotaproduct",
];

const PRICE_RANGES = [
  [],
  [0, 19],  [20, 39], [40, 59],
  [60, 79], [80, 99], [100, 9999],
];

const BASE_URL = __ENV.BASE_URL || "http://localhost:6060";

const SEED_USERS = [
  { email: "test@example.com",  password: "Test@1234"  },
  { email: "admin@example.com", password: "Admin@1234" },
];

export function setup() {
  
  let categoryIds = [];
  const catRes = http.get(`${BASE_URL}/api/v1/category/get-category`, {
    timeout: "15s",
  });
  if (catRes.status === 200) {
    try {
      categoryIds = (JSON.parse(catRes.body).category || []).map((c) => c._id);
      console.log(`[setup] ${categoryIds.length} category IDs fetched.`);
    } catch {
      console.warn("[setup] Failed to parse category response.");
    }
  } else {
    console.warn(`[setup] Category fetch failed (status ${catRes.status}).`);
  }

  const userPool = [];
  for (const cred of SEED_USERS) {
    const res = http.post(
      `${BASE_URL}/api/v1/auth/login`,
      JSON.stringify({ email: cred.email, password: cred.password }),
      { headers: { "Content-Type": "application/json" }, timeout: "15s" }
    );
    if (res.status === 200) {
      try {
        const body = JSON.parse(res.body);
        if (body.token && body.user && body.user._id) {
          userPool.push({ token: body.token, userId: body.user._id, email: cred.email });
          console.log(`[setup] Authenticated ${cred.email}.`);
        }
      } catch {
        console.warn(`[setup] Failed to parse login response for ${cred.email}.`);
      }
    } else {
      console.warn(`[setup] Login failed for ${cred.email}: status=${res.status}.`);
    }
  }

  if (userPool.length === 0) {
    console.warn(
      "[setup] No users authenticated. The orders scenario (5 %) will " +
      "fall back to product-list. Ensure SEED_USERS exist in the test DB."
    );
  }

  return { categoryIds, userPool };
}

function buildFilterPayload(categoryIds) {
  const roll = Math.random();
  const randomCat = () =>
    categoryIds.length > 0
      ? [categoryIds[Math.floor(Math.random() * categoryIds.length)]]
      : [];
  const randomPrice = () =>
    PRICE_RANGES[Math.floor(Math.random() * PRICE_RANGES.length)];

  if (roll < 0.25)       return { checked: randomCat(), radio: [] };
  else if (roll < 0.50)  return { checked: [], radio: randomPrice() };
  else if (roll < 0.75)  return { checked: randomCat(), radio: randomPrice() };
  else                   return { checked: [], radio: [] };
}

function recordAndCheck(res, scenario, expectedStatuses) {
  const isExpected = expectedStatuses.includes(res.status);
  const isError    = !isExpected;

  overallResponseTime.add(res.timings.duration);
  overallErrorRate.add(isError);
  ttfbTrend.add(res.timings.waiting); 

  if (res.status >= 500) serverErrors.add(1);

  switch (scenario) {
    case "browse":
      browseRT.add(res.timings.duration);
      browseErrorRate.add(isError);
      break;
    case "filter":
      filterRT.add(res.timings.duration);
      filterErrorRate.add(isError);
      break;
    case "search":
      searchRT.add(res.timings.duration);
      searchErrorRate.add(isError);
      break;
    case "category":
      categoryRT.add(res.timings.duration);
      categoryErrorRate.add(isError);
      break;
    case "login":
      loginRT.add(res.timings.duration);
      loginErrorRate.add(isError);
      break;
    case "orders":
      ordersRT.add(res.timings.duration);
      ordersErrorRate.add(isError);
      break;
  }

  check(res, {
    "no 5xx server error":              (r) => r.status < 500,
    "no transport error (status != 0)": (r) => r.status !== 0,
    "response body is non-empty":       (r) => r.body && r.body.length > 0,
    "response is valid JSON":           (r) => {
      try { JSON.parse(r.body); return true; } catch { return false; }
    },
  });
}

export const options = {
  
  stages: [
    { duration: "30s", target: 150 },
    { duration: "5m",  target: 150 },
    { duration: "30s", target: 0   },
  ],

  summaryTrendStats: ["avg", "min", "max", "p(90)", "p(95)", "p(99)"],

  thresholds: {
    "mixed_server_errors_5xx": ["count<10"],
  },
};

const W_BROWSE   = 0.40;
const W_FILTER   = 0.60;
const W_SEARCH   = 0.75;
const W_CATEGORY = 0.85;
const W_LOGIN    = 0.95;

export default function (data) {
  const { categoryIds, userPool } = data;
  const roll = Math.random();

  if (roll < W_BROWSE) {
    
    const res = http.get(`${BASE_URL}/api/v1/product/product-list/1`, {
      tags: { endpoint: "browse" },
      timeout: "10s",
    });
    recordAndCheck(res, "browse", [200]);
    check(res, {
      "browse: status 200":                 (r) => r.status === 200,
      "browse: contains products array":    (r) => {
        if (r.status !== 200) return true;
        try { return Array.isArray(JSON.parse(r.body).products); } catch { return false; }
      },
    });

  } else if (roll < W_FILTER) {
    
    const payload = buildFilterPayload(categoryIds);
    const res = http.post(
      `${BASE_URL}/api/v1/product/product-filters`,
      JSON.stringify(payload),
      {
        headers: { "Content-Type": "application/json" },
        tags: { endpoint: "filter" },
        timeout: "10s",
      }
    );
    recordAndCheck(res, "filter", [200]);
    check(res, {
      "filter: status 200":              (r) => r.status === 200,
      "filter: contains products array": (r) => {
        if (r.status !== 200) return true;
        try { return Array.isArray(JSON.parse(r.body).products); } catch { return false; }
      },
    });

  } else if (roll < W_SEARCH) {
    
    const keyword = KEYWORDS[Math.floor(Math.random() * KEYWORDS.length)];
    const res = http.get(
      `${BASE_URL}/api/v1/product/search/${encodeURIComponent(keyword)}`,
      { tags: { endpoint: "search" }, timeout: "10s" }
    );
    recordAndCheck(res, "search", [200]);
    check(res, {
      "search: status 200":             (r) => r.status === 200,
      "search: contains results array": (r) => {
        if (r.status !== 200) return true;
        try { return Array.isArray(JSON.parse(r.body).results); } catch { return false; }
      },
    });

  } else if (roll < W_CATEGORY) {
    
    const res = http.get(`${BASE_URL}/api/v1/category/get-category`, {
      tags: { endpoint: "category" },
      timeout: "10s",
    });
    recordAndCheck(res, "category", [200]);
    check(res, {
      "category: status 200":              (r) => r.status === 200,
      "category: contains category array": (r) => {
        if (r.status !== 200) return true;
        try { return Array.isArray(JSON.parse(r.body).category); } catch { return false; }
      },
    });

  } else if (roll < W_LOGIN) {
    
    const useValid = Math.random() < 0.75;
    let payload, expectedStatuses;

    if (useValid && userPool.length > 0) {
      const u = userPool[(__VU - 1) % userPool.length];
      payload          = JSON.stringify({ email: u.email, password: SEED_USERS.find(s => s.email === u.email)?.password });
      expectedStatuses = [200];
    } else {
      payload          = JSON.stringify({ email: "nobody_xyzzy@notadomain.invalid", password: "WrongPass!" });
      expectedStatuses = [401, 404];
    }

    const res = http.post(
      `${BASE_URL}/api/v1/auth/login`,
      payload,
      {
        headers: { "Content-Type": "application/json" },
        tags: { endpoint: "login" },
        timeout: "10s",
      }
    );
    recordAndCheck(res, "login", expectedStatuses);
    check(res, {
      "login: expected status": (r) => expectedStatuses.includes(r.status),
      "login: valid creds return token": (r) => {
        if (!useValid || r.status !== 200) return true;
        try { return typeof JSON.parse(r.body).token === "string"; } catch { return false; }
      },
      "login: invalid creds not 500": (r) => {
        if (useValid) return true;
        return r.status !== 500;
      },
    });

  } else {
    
    if (userPool.length === 0) {
      
      const res = http.get(`${BASE_URL}/api/v1/product/product-list/1`, {
        tags: { endpoint: "browse-fallback" },
        timeout: "10s",
      });
      recordAndCheck(res, "browse", [200]);
      sleep(0.5);
      return;
    }

    const user = userPool[(__VU - 1) % userPool.length];
    const res  = http.get(`${BASE_URL}/api/v1/auth/orders`, {
      headers: { Authorization: user.token },
      tags: { endpoint: "orders" },
      timeout: "10s",
    });
    recordAndCheck(res, "orders", [200]);
    check(res, {
      "orders: status 200":        (r) => r.status === 200,
      "orders: response is array": (r) => {
        if (r.status !== 200) return true;
        try { return Array.isArray(JSON.parse(r.body)); } catch { return false; }
      },
      "orders: no 401 under load": (r) => r.status !== 401,
    });
  }

  sleep(0.5 + Math.random() * 0.5); 
}

export function handleSummary(data) {
  const metric = (name, key) => {
    const m = data.metrics[name];
    return m !== undefined ? m.values[key] : null;
  };

  const fmt  = (v, d = 2) =>
    v !== null && v !== undefined ? Number(v).toFixed(d) : "N/A";
  const pct  = (v) =>
    v !== null && v !== undefined ? (Number(v) * 100).toFixed(2) + "%" : "N/A";

  const p95Overall  = metric("mixed_overall_response_time", "p(95)");
  const p99http     = metric("http_req_duration",            "p(99)");
  const p95http     = metric("http_req_duration",            "p(95)");
  const errOverall  = metric("mixed_overall_error_rate",     "rate");
  const reqFailed   = metric("http_req_failed",              "rate");
  const totalReqs   = metric("http_reqs",                    "count");
  const serverErr   = metric("mixed_server_errors_5xx",      "count") ?? 0;

  const ttfbP95 = metric("mixed_ttfb_waiting", "p(95)");
  const ttfbP99 = metric("mixed_ttfb_waiting", "p(99)");
  const ttfbAvg = metric("mixed_ttfb_waiting", "avg");

  const p95Browse   = metric("mixed_rt_browse",   "p(95)");
  const p95Filter   = metric("mixed_rt_filter",   "p(95)");
  const p95Search   = metric("mixed_rt_search",   "p(95)");
  const p95Category = metric("mixed_rt_category", "p(95)");
  const p95Login    = metric("mixed_rt_login",    "p(95)");
  const p95Orders   = metric("mixed_rt_orders",   "p(95)");

  const errBrowse   = metric("mixed_err_browse",   "rate");
  const errFilter   = metric("mixed_err_filter",   "rate");
  const errSearch   = metric("mixed_err_search",   "rate");
  const errCategory = metric("mixed_err_category", "rate");
  const errLogin    = metric("mixed_err_login",    "rate");
  const errOrders   = metric("mixed_err_orders",   "rate");

  let eventLoopNote;
  const gapRaw = (p99http !== null && p95http !== null) ? (p99http - p95http) : null;
  const gapStr = gapRaw !== null ? fmt(gapRaw, 0) : "N/A";

  if (gapRaw !== null) {
    if (gapRaw > 2000) {
      eventLoopNote =
        `ELEVATED: p99−p95 gap = ${gapStr} ms. ` +
        "Intermittent event-loop stalls detected under mixed load " +
        "(likely bcrypt or blocking I/O saturating the libuv thread pool). " +
        "Profile with `node --inspect` → Performance monitor → Event Loop Delay.";
    } else if (gapRaw > 500) {
      eventLoopNote =
        `MODERATE: p99−p95 gap = ${gapStr} ms. ` +
        "Some tail latency variance observed; monitor as VU count increases.";
    } else {
      eventLoopNote =
        `LOW: p99−p95 gap = ${gapStr} ms. ` +
        "Event loop appears healthy — no significant stall signal in k6 metrics.";
    }
  } else if (ttfbP95 !== null) {
    
    if (ttfbP95 > 5000) {
      eventLoopNote =
        `ELEVATED (via TTFB p95=${fmt(ttfbP95)} ms, p99 unavailable). ` +
        "Server is spending >5 s before sending the first byte — strong signal of " +
        "event-loop saturation or connection-pool exhaustion. " +
        "Profile with `node --inspect` → Performance monitor → Event Loop Delay. " +
        "Add summaryTrendStats:[\"p(99)\"] to options for the gap metric on next run.";
    } else if (ttfbP95 > 1000) {
      eventLoopNote =
        `MODERATE (via TTFB p95=${fmt(ttfbP95)} ms, p99 unavailable). ` +
        "Server response time elevated; possible event-loop queuing under load.";
    } else {
      eventLoopNote =
        `LOW (via TTFB p95=${fmt(ttfbP95)} ms, p99 unavailable). ` +
        "No significant stall signal in available k6 metrics.";
    }
  } else {
    eventLoopNote = "Insufficient data (p99 and TTFB both unavailable).";
  }

  console.log("\n==========================================");
  console.log("STRESS-10 — Mixed Workload Stress Test");
  console.log("==========================================");
  console.log(`Total requests sent              : ${fmt(totalReqs, 0)}`);
  console.log("");
  console.log("── Overall ────────────────────────────────");
  console.log(`p95 response time (all endpoints): ${fmt(p95Overall)} ms  (informational)`);
  console.log(`p99 http_req_duration            : ${fmt(p99http)} ms  (informational)`);
  console.log(`Overall HTTP error rate          : ${pct(errOverall)}  (informational)`);
  console.log(`Transport failure rate           : ${pct(reqFailed)}  (informational)`);
  console.log(`5xx server errors                : ${fmt(serverErr, 0)}  (threshold: < 10)`);
  console.log("");
  console.log("── Per-endpoint p95 / error rate ──────────");
  console.log(`  browse   (40%): p95=${fmt(p95Browse)} ms  err=${pct(errBrowse)}  (informational)`);
  console.log(`  filter   (20%): p95=${fmt(p95Filter)} ms  err=${pct(errFilter)}  (informational)`);
  console.log(`  search   (15%): p95=${fmt(p95Search)} ms  err=${pct(errSearch)}  (informational)`);
  console.log(`  category (10%): p95=${fmt(p95Category)} ms  err=${pct(errCategory)}  (informational)`);
  console.log(`  login    (10%): p95=${fmt(p95Login)} ms  err=${pct(errLogin)}  (informational)`);
  console.log(`  orders    (5%): p95=${fmt(p95Orders)} ms  err=${pct(errOrders)}  (informational)`);
  console.log("");
  console.log("── Node.js event-loop lag (k6 proxy) ───────");
  console.log(`  TTFB p95 (http_req_waiting)    : ${fmt(ttfbP95)} ms`);
  console.log(`  TTFB p99 (http_req_waiting)    : ${fmt(ttfbP99)} ms`);
  console.log(`  TTFB avg (http_req_waiting)    : ${fmt(ttfbAvg)} ms`);
  console.log(`  p99−p95 http_req_duration gap  : ${gapStr} ms`);
  console.log(`  Assessment: ${eventLoopNote}`);
  console.log("------------------------------------------");

  const breaches = [];
  for (const [name, m] of Object.entries(data.metrics)) {
    if (!m.thresholds) continue;
    for (const [expr, result] of Object.entries(m.thresholds)) {
      if (!result.ok) breaches.push(`  FAILED  [${name}] ${expr}`);
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
