//Aashim Mahindroo, A0265890R

//Based on the directions of my user stories and testing methodology, Github Copilot generates initial test code for this file.
//Then I manually review the code and make necessary adjustments to ensure accuracy and relevance to the project requirements.

import http from "k6/http";
import { check, sleep } from "k6";
import { Rate, Trend, Counter, Gauge } from "k6/metrics";

const errorRate = new Rate("http_error_rate");

const responseTime = new Trend("product_photo_response_time", true);

const notFoundCount = new Counter("photo_not_found_404");

const serverErrorCount = new Counter("photo_server_error_500");

const badContentType = new Counter("photo_bad_content_type");

const photoPayloadSize = new Gauge("photo_payload_bytes");

const BASE_URL = __ENV.BASE_URL || "http://localhost:6060";

export function setup() {
  const res = http.get(`${BASE_URL}/api/v1/product/get-product`, {
    timeout: "15s",
  });

  if (res.status !== 200) {
    console.warn(
      `Could not fetch product list (status ${res.status}). ` +
        "All iterations will use the fallback invalid-ID pool."
    );
    return { productIds: [] };
  }

  try {
    const body = JSON.parse(res.body);
    const ids = (body.products || []).map((p) => p._id).filter(Boolean);
    console.log(`Fetched ${ids.length} product IDs for photo stress test.`);
    return { productIds: ids };
  } catch {
    console.warn("Failed to parse product list response. Using empty productIds.");
    return { productIds: [] };
  }
}

const INVALID_IDS = [
  "000000000000000000000001",
  "000000000000000000000002",
  "ffffffffffffffffffffffff",
  "aaaaaaaaaaaaaaaaaaaaaaaa",
  "deadbeefdeadbeefdeadbeef",
];

export const options = {
  summaryTrendStats: ["avg", "min", "max", "p(90)", "p(95)", "p(99)"],

  stages: [
    { duration: "30s", target: 50  },
    { duration: "2m",  target: 50  },
    { duration: "20s", target: 0   },
  ],

  thresholds: {
    "photo_server_error_500": ["count==0"],

    "photo_bad_content_type": ["count==0"],
  },
};

export default function (data) {
  const productIds = (data && data.productIds) || [];

  let pid;
  let expectingNotFound = false;

  if (productIds.length === 0 || Math.random() < 0.1) {
    pid = INVALID_IDS[Math.floor(Math.random() * INVALID_IDS.length)];
    expectingNotFound = true;
  } else {
    pid = productIds[Math.floor(Math.random() * productIds.length)];
  }

  const url = `${BASE_URL}/api/v1/product/product-photo/${pid}`;

  const res = http.get(url, {
    tags: {
      endpoint: "product-photo",
      
      id_type: expectingNotFound ? "invalid" : "valid",
    },
    timeout: "15s",
  });

  responseTime.add(res.timings.duration);

  if (res.status === 404) {
    notFoundCount.add(1);
  } else if (res.status === 500) {
    serverErrorCount.add(1);
  }

  const isExpectedOutcome =
    (expectingNotFound && res.status === 404) ||
    (!expectingNotFound && res.status === 200);
  errorRate.add(!isExpectedOutcome);

  if (res.status === 200) {
    const contentType = res.headers["Content-Type"] || "";
    const isImageType = contentType.startsWith("image/");

    if (!isImageType) {
      badContentType.add(1);
    }

    photoPayloadSize.add(res.body ? res.body.length : 0);
  }

  check(res, {
    
    "valid ID returns 200": (r) => {
      if (expectingNotFound) return true; 
      return r.status === 200;
    },

    "invalid ID returns 404 not 500": (r) => {
      if (!expectingNotFound) return true; 
      return r.status === 404;
    },

    "no 500 server error": (r) => r.status !== 500,

    "200 response has image Content-Type": (r) => {
      if (r.status !== 200) return true;
      const ct = r.headers["Content-Type"] || "";
      return ct.startsWith("image/");
    },

    "response body is non-empty": (r) => r.body && r.body.length > 0,

    "no transport error (status != 0)": (r) => r.status !== 0,
  });

  sleep(0.5);
}

export function handleSummary(data) {
  const metric = (name, valueKey) => {
    const m = data.metrics[name];
    return m ? m.values[valueKey] : null;
  };

  const p95 = metric("product_photo_response_time", "p(95)");
  const reqFailed = metric("http_req_failed", "rate");
  const totalReqs = metric("http_reqs", "count");
  const notFound   = metric("photo_not_found_404",    "count") ?? 0;
  const serverErr   = metric("photo_server_error_500", "count") ?? 0;
  const badCT       = metric("photo_bad_content_type", "count") ?? 0;
  const payloadLast = metric("photo_payload_bytes",    "value");

  const fmt = (v, decimals = 2) =>
    v !== null && v !== undefined ? Number(v).toFixed(decimals) : "N/A";

  console.log("\n==========================================");
  console.log("STRESS-04 — Product Photo Stress Test");
  console.log("==========================================");
  console.log(`Total requests sent        : ${fmt(totalReqs, 0)}`);
  console.log(`p95 response time          : ${fmt(p95)} ms  (informational)`);
  console.log(`k6 http_req_failed rate       : ${reqFailed !== null ? (reqFailed * 100).toFixed(2) : "N/A"}%  (informational — includes expected 404s)`);
  console.log(`404 (invalid-ID probes)    : ${fmt(notFound, 0)}  (expected)`);
  console.log(`500 server errors          : ${fmt(serverErr, 0)}  (threshold: 0)`);
  console.log(`Bad Content-Type (200s)    : ${fmt(badCT, 0)}  (threshold: 0)`);
  console.log(`Last photo payload size    : ${fmt(payloadLast, 0)} bytes`);
  console.log("------------------------------------------");
  console.log("Memory-leak signal: if photo_server_error_500 > 0 or");
  console.log("p99 http_req_duration climbs steadily through the soak");
  console.log("window, profile the server heap with --inspect.");
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
