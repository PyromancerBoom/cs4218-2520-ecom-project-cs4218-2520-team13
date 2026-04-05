//Aashim Mahindroo, A0265890R

//Based on the directions of my user stories and testing methodology, Github Copilot generates initial test code for this file.
//Then I manually review the code and make necessary adjustments to ensure accuracy and relevance to the project requirements.


import http from "k6/http";
import { check, sleep } from "k6";
import { Rate, Trend } from "k6/metrics";

const errorRate = new Rate("http_error_rate");

const responseTime = new Trend("product_listing_response_time", true);

export const options = {
  summaryTrendStats: ["avg", "min", "max", "p(90)", "p(95)", "p(99)"],

  stages: [
    { duration: "30s", target: 200 }, 
    { duration: "2m",  target: 200 }, 
    { duration: "20s", target: 0   }, 
  ],

  thresholds: {},
};

const BASE_URL = __ENV.BASE_URL || "http://localhost:6060";
const ENDPOINT = `${BASE_URL}/api/v1/product/product-list/1`;

export default function () {
  const res = http.get(ENDPOINT, {
    tags: { endpoint: "product-list" },
    
    timeout: "10s",
  });

  responseTime.add(res.timings.duration);
  errorRate.add(res.status < 200 || res.status >= 300);

  check(res, {
    
    "status is 200": (r) => r.status === 200,

    "response is valid JSON": (r) => {
      try {
        JSON.parse(r.body);
        return true;
      } catch {
        return false;
      }
    },
    "response contains products array": (r) => {
      try {
        const body = JSON.parse(r.body);
        return Array.isArray(body.products);
      } catch {
        return false;
      }
    },
    "success flag is true": (r) => {
      try {
        return JSON.parse(r.body).success === true;
      } catch {
        return false;
      }
    },
    
    "response body is non-empty": (r) => r.body && r.body.length > 0,
  });

  sleep(0.5);
}

export function handleSummary(data) {
  const metric = (name, valueKey) => {
    const m = data.metrics[name];
    return m !== undefined ? m.values[valueKey] : null;
  };

  const p95       = metric("product_listing_response_time", "p(95)");
  const p99http   = metric("http_req_duration",             "p(99)");
  const errRate   = metric("http_error_rate",               "rate");
  const reqFailed = metric("http_req_failed",               "rate");
  const totalReqs = metric("http_reqs",                    "count");

  const fmt = (v, d = 2) =>
    v !== null && v !== undefined ? Number(v).toFixed(d) : "N/A";

  console.log("\n========================================");
  console.log("STRESS-01 — Product Listing Stress Test");
  console.log("========================================");
  console.log(`Total requests sent   : ${fmt(totalReqs, 0)}`);
  console.log(`p95 response time     : ${fmt(p95)} ms  (informational)`);
  console.log(`p99 HTTP req duration : ${fmt(p99http)} ms  (informational)`);
  console.log(`HTTP error rate       : ${errRate !== null ? (errRate * 100).toFixed(2) : "N/A"}%  (informational)`);
  console.log(`k6 http_req_failed    : ${reqFailed !== null ? (reqFailed * 100).toFixed(2) : "N/A"}%  (informational)`);
  console.log("----------------------------------------");

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
  console.log("========================================\n");

  return {
    stdout: "",
  };
}
