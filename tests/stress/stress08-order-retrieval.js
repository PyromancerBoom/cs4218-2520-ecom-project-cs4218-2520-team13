//Aashim Mahindroo, A0265890R

//Based on the directions of my user stories and testing methodology, Github Copilot generates initial test code for this file.
//Then I manually review the code and make necessary adjustments to ensure accuracy and relevance to the project requirements.

import http from "k6/http";
import { check, sleep } from "k6";
import { Rate, Trend, Counter } from "k6/metrics";

const errorRate = new Rate("http_error_rate");

const responseTime = new Trend("order_retrieval_response_time", true);

const serverErrorCount = new Counter("orders_server_error_5xx");

const badTokenWrongStatus = new Counter("orders_bad_token_wrong_status");

const nonArrayResponse = new Counter("orders_non_array_body");

const isolationViolations = new Counter("orders_isolation_violations");

const INVALID_TOKENS = [
  "thisisnotavalidjwt",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiIwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDEiLCJpYXQiOjE3MDAwMDAwMDB9.invalidsignaturexyz",
  "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.shouldfail.abc",
];

const BASE_URL = __ENV.BASE_URL || "http://localhost:6060";
const LOGIN_ENDPOINT    = `${BASE_URL}/api/v1/auth/login`;
const REGISTER_ENDPOINT = `${BASE_URL}/api/v1/auth/register`;
const ORDERS_ENDPOINT   = `${BASE_URL}/api/v1/auth/orders`;

const SEED_USERS = [
  { email: "stress08_test@load.test.invalid",  password: "Test@1234",  name: "Stress08 Test",  phone: "0000000081", address: "1 Test St",  answer: "stress" },
  { email: "stress08_admin@load.test.invalid", password: "Admin@1234", name: "Stress08 Admin", phone: "0000000082", address: "2 Admin St", answer: "stress" },
];

function decodeJwtPayload(token) {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    
    const padded = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const pad = padded.length % 4;
    const base64 = pad ? padded + "=".repeat(4 - pad) : padded;
    return JSON.parse(atob(base64));
  } catch {
    return null;
  }
}

export function setup() {
  const userPool = [];

  for (const cred of SEED_USERS) {
    let res = http.post(
      LOGIN_ENDPOINT,
      JSON.stringify({ email: cred.email, password: cred.password }),
      {
        headers: { "Content-Type": "application/json" },
        timeout: "15s",
      }
    );

    if (res.status === 404) {
      console.log(`[setup] ${cred.email} not found — registering for this test run...`);
      const regRes = http.post(
        REGISTER_ENDPOINT,
        JSON.stringify({
          name:     cred.name,
          email:    cred.email,
          password: cred.password,
          phone:    cred.phone,
          address:  cred.address,
          answer:   cred.answer,
        }),
        { headers: { "Content-Type": "application/json" }, timeout: "15s" }
      );
      if (regRes.status !== 201) {
        console.warn(
          `[setup] Registration failed for ${cred.email}: ` +
          `status=${regRes.status} body=${regRes.body}`
        );
        continue;
      }
      res = http.post(
        LOGIN_ENDPOINT,
        JSON.stringify({ email: cred.email, password: cred.password }),
        { headers: { "Content-Type": "application/json" }, timeout: "15s" }
      );
    }

    if (res.status !== 200) {
      console.warn(
        `[setup] Login failed for ${cred.email}: ` +
        `status=${res.status} body=${res.body}`
      );
      continue;
    }

    let token, userId;
    try {
      const body = JSON.parse(res.body);
      token  = body.token;
      userId = body.user && body.user._id;
    } catch {
      console.warn(`[setup] Failed to parse login response for ${cred.email}`);
      continue;
    }

    if (!token || !userId) {
      console.warn(`[setup] Missing token or userId for ${cred.email}`);
      continue;
    }

    const payload = decodeJwtPayload(token);
    const jwtUserId = payload && payload._id;
    if (jwtUserId && jwtUserId !== userId) {
      console.warn(
        `[setup] userId mismatch for ${cred.email}: ` +
        `login body=${userId} jwt payload=${jwtUserId}. Using JWT payload value.`
      );
      userId = jwtUserId;
    }

    userPool.push({ token, userId, email: cred.email });
    console.log(`[setup] Authenticated ${cred.email} (userId=${userId})`);
  }

  if (userPool.length === 0) {
    
    console.error(
      "[setup] FATAL: no users authenticated. " +
      "Ensure SEED_USERS exist in the test database before running this test."
    );
  } else {
    console.log(`[setup] ${userPool.length} user(s) ready in pool.`);
  }

  return { userPool };
}

export const options = {
  summaryTrendStats: ["avg", "min", "max", "p(90)", "p(95)", "p(99)"],

  stages: [
    { duration: "30s", target: 100 },
    { duration: "2m",  target: 100 },
    { duration: "20s", target: 0   },
  ],

  thresholds: {
    "orders_server_error_5xx":      ["count<5"],

    "orders_bad_token_wrong_status": ["count==0"],

    "orders_isolation_violations":  ["count==0"],
  },
};

export default function (data) {
  const { userPool } = data;

  const useValidToken = Math.random() < 0.9;

  let authHeader, expectedStatus, userId;

  if (!useValidToken || userPool.length === 0) {
    
    authHeader     = INVALID_TOKENS[(__VU - 1) % INVALID_TOKENS.length];
    expectedStatus = 401;
    userId         = null;
  } else {
    
    const user  = userPool[(__VU - 1) % userPool.length];
    authHeader  = user.token;
    expectedStatus = 200;
    userId      = user.userId;
  }

  const res = http.get(ORDERS_ENDPOINT, {
    headers: { Authorization: authHeader },
    tags: {
      endpoint: "auth-orders",
      token_type: useValidToken ? "valid" : "invalid",
    },
    timeout: "10s",
  });

  responseTime.add(res.timings.duration);

  const is5xx = res.status >= 500;

  if (is5xx) {
    serverErrorCount.add(1);
  }

  if (!useValidToken && res.status !== 401) {
    badTokenWrongStatus.add(1);
  }

  const isExpected = res.status === expectedStatus;
  errorRate.add(!isExpected);

  if (useValidToken && res.status === 200 && userId) {
    try {
      const orders = JSON.parse(res.body);

      if (!Array.isArray(orders)) {
        nonArrayResponse.add(1);
      } else {
        for (const order of orders) {
          
          const buyerId =
            order.buyer && (order.buyer._id || order.buyer);
          
          const buyerIdStr =
            typeof buyerId === "object" ? JSON.stringify(buyerId) : String(buyerId);
          if (buyerIdStr !== String(userId)) {
            isolationViolations.add(1);
          }
        }
      }
    } catch {
      nonArrayResponse.add(1);
    }
  }

  check(res, {
    
    "valid token returns 200": (r) => {
      if (!useValidToken) return true;
      return r.status === 200;
    },

    "200 response is array": (r) => {
      if (!useValidToken || r.status !== 200) return true;
      try {
        return Array.isArray(JSON.parse(r.body));
      } catch {
        return false;
      }
    },

    "no cross-user orders in response": (r) => {
      if (!useValidToken || r.status !== 200 || !userId) return true;
      try {
        const orders = JSON.parse(r.body);
        if (!Array.isArray(orders)) return true;
        return orders.every((order) => {
          const buyerId = order.buyer && (order.buyer._id || order.buyer);
          return String(buyerId) === String(userId);
        });
      } catch {
        return true; 
      }
    },

    "invalid token returns 401": (r) => {
      if (useValidToken) return true;
      return r.status === 401;
    },

    "no 5xx server error": (r) => r.status < 500,

    "response is valid JSON": (r) => {
      try {
        JSON.parse(r.body);
        return true;
      } catch {
        return false;
      }
    },

    "no transport error (status != 0)": (r) => r.status !== 0,
  });

  sleep(0.5);
}

export function handleSummary(data) {
  const metric = (name, valueKey) => {
    const m = data.metrics[name];
    return m !== undefined ? m.values[valueKey] : null;
  };

  const p95          = metric("order_retrieval_response_time", "p(95)");
  const reqFailed    = metric("http_req_failed",                "rate");
  const totalReqs    = metric("http_reqs",                      "count");
  const serverErr    = metric("orders_server_error_5xx",       "count") ?? 0;
  const badToken     = metric("orders_bad_token_wrong_status", "count") ?? 0;
  const nonArray     = metric("orders_non_array_body",         "count") ?? 0;
  const isolation    = metric("orders_isolation_violations",   "count") ?? 0;

  const fmt = (v, d = 2) =>
    v !== null && v !== undefined ? Number(v).toFixed(d) : "N/A";

  console.log("\n==========================================");
  console.log("STRESS-08 — Order Retrieval Stress Test");
  console.log("==========================================");
  console.log(`Total requests sent              : ${fmt(totalReqs, 0)}`);
  console.log(`p95 response time                : ${fmt(p95)} ms  (informational)`);
  console.log(`k6 http_req_failed rate          : ${reqFailed !== null ? (reqFailed * 100).toFixed(2) : "N/A"}%  (informational — includes expected 401s)`);
  console.log(`5xx server errors                : ${fmt(serverErr, 0)}  (threshold: < 5)`);
  console.log(`Bad-token → non-401 responses    : ${fmt(badToken, 0)}  (threshold: 0)`);
  console.log(`Non-array 200 bodies             : ${fmt(nonArray, 0)}  (informational)`);
  console.log(`Data-isolation violations        : ${fmt(isolation, 0)}  (threshold: 0)`);
  console.log("------------------------------------------");
  console.log("Isolation note: orders_isolation_violations > 0 means the");
  console.log("server returned orders where buyer._id != authenticated userId.");
  console.log("This indicates request-context mixing — audit req.user scoping.");
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
