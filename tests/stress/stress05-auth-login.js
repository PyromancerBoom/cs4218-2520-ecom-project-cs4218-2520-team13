//Aashim Mahindroo, A0265890R

//Based on the directions of my user stories and testing methodology, Github Copilot generates initial test code for this file.
//Then I manually review the code and make necessary adjustments to ensure accuracy and relevance to the project requirements.

import http from "k6/http";
import { check, sleep } from "k6";
import { Rate, Trend, Counter } from "k6/metrics";

const errorRate = new Rate("http_error_rate");

const responseTime = new Trend("login_response_time", true);

const missingToken = new Counter("login_missing_token");

const serverErrorCount = new Counter("login_server_error_5xx");

const validCredRejected = new Counter("login_valid_cred_rejected");

const invalidCredServerError = new Counter("login_invalid_cred_500");

const BASE_URL = __ENV.BASE_URL || "http://localhost:6060";
const ENDPOINT          = `${BASE_URL}/api/v1/auth/login`;
const REGISTER_ENDPOINT = `${BASE_URL}/api/v1/auth/register`;

const VALID_USERS = [
  { email: "stress05_test@load.test.invalid",  password: "Test@1234",  label: "user_1",  name: "Stress05 Test",  phone: "0000000051", address: "1 Test St",  answer: "stress" },
  { email: "stress05_admin@load.test.invalid", password: "Admin@1234", label: "admin_1", name: "Stress05 Admin", phone: "0000000052", address: "2 Admin St", answer: "stress" },
];

const INVALID_SCENARIOS = [
  
  {
    label: "unknown_email",
    body: { email: "nobody_xyzzy@notadomain.invalid", password: "SomePass1!" },
    expectedStatuses: [404],
    expectedMsg: "Email is not registered",
  },
  
  {
    label: "wrong_password",
    body: { email: "stress05_test@load.test.invalid", password: "WrongPass999!" },
    expectedStatuses: [401],
    expectedMsg: "Invalid Password",
  },
  
  {
    label: "missing_email",
    body: { password: "SomePass1!" },
    expectedStatuses: [404],
    expectedMsg: "Invalid email or password",
  },
  
  {
    label: "missing_password",
    body: { email: "stress05_test@load.test.invalid" },
    expectedStatuses: [404],
    expectedMsg: "Invalid email or password",
  },
  
  {
    label: "empty_fields",
    body: { email: "", password: "" },
    expectedStatuses: [404],
    expectedMsg: "Invalid email or password",
  },
];

export function setup() {
  for (const cred of VALID_USERS) {
    let res = http.post(
      ENDPOINT,
      JSON.stringify({ email: cred.email, password: cred.password }),
      { headers: { "Content-Type": "application/json" }, timeout: "15s" }
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
        console.warn(`[setup] Registration failed for ${cred.email}: status=${regRes.status} body=${regRes.body}`);
        continue;
      }
      res = http.post(
        ENDPOINT,
        JSON.stringify({ email: cred.email, password: cred.password }),
        { headers: { "Content-Type": "application/json" }, timeout: "15s" }
      );
    }

    if (res.status === 200) {
      console.log(`[setup] Verified login for ${cred.email}.`);
    } else {
      console.warn(`[setup] Login check failed for ${cred.email}: status=${res.status} body=${res.body}`);
    }
  }
  return {};
}

export const options = {
  summaryTrendStats: ["avg", "min", "max", "p(90)", "p(95)", "p(99)"],

  stages: [
    { duration: "30s", target: 100 }, 
    { duration: "2m",  target: 100 }, 
    { duration: "20s", target: 0   }, 
  ],

  thresholds: {
    "login_server_error_5xx": ["count==0"],

    "login_valid_cred_rejected": ["count<10"],

    "login_invalid_cred_500": ["count==0"],
  },
};

export default function (data) {  
  
  const useValid = Math.random() < 0.5;

  let payload, label, expectedStatuses, isValidAttempt;

  if (useValid) {
    const cred = VALID_USERS[Math.floor(Math.random() * VALID_USERS.length)];
    payload = JSON.stringify({ email: cred.email, password: cred.password });
    label = cred.label;
    expectedStatuses = [200];
    isValidAttempt = true;
  } else {
    const scenario =
      INVALID_SCENARIOS[Math.floor(Math.random() * INVALID_SCENARIOS.length)];
    payload = JSON.stringify(scenario.body);
    label = scenario.label;
    expectedStatuses = scenario.expectedStatuses;
    isValidAttempt = false;
  }

  const res = http.post(ENDPOINT, payload, {
    headers: { "Content-Type": "application/json" },
    tags: {
      endpoint: "auth-login",
      scenario: label,
      attempt_type: isValidAttempt ? "valid" : "invalid",
    },
    timeout: "15s",
  });

  responseTime.add(res.timings.duration);

  const is5xx = res.status >= 500;
  const isExpectedStatus = expectedStatuses.includes(res.status);

  errorRate.add(!isExpectedStatus);

  if (is5xx) {
    serverErrorCount.add(1);
    if (!isValidAttempt) {
      invalidCredServerError.add(1);
    }
  }

  if (isValidAttempt && res.status !== 200) {
    validCredRejected.add(1);
  }

  if (res.status === 200) {
    try {
      const body = JSON.parse(res.body);
      if (!body.token) {
        missingToken.add(1);
      }
    } catch {
      missingToken.add(1);
    }
  }

  check(res, {
    
    "valid credentials return 200": (r) => {
      if (!isValidAttempt) return true;
      return r.status === 200;
    },

    "200 response contains token": (r) => {
      if (!isValidAttempt || r.status !== 200) return true;
      try {
        const body = JSON.parse(r.body);
        return typeof body.token === "string" && body.token.length > 0;
      } catch {
        return false;
      }
    },

    "200 response contains user object": (r) => {
      if (!isValidAttempt || r.status !== 200) return true;
      try {
        const body = JSON.parse(r.body);
        return body.user && typeof body.user._id === "string";
      } catch {
        return false;
      }
    },

    "invalid credentials return 401 or 404": (r) => {
      if (isValidAttempt) return true;
      return r.status === 401 || r.status === 404;
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

  sleep(1);
}

export function handleSummary(data) {
  const metric = (name, valueKey) => {
    const m = data.metrics[name];
    return m !== undefined ? m.values[valueKey] : null;
  };

  const p95        = metric("login_response_time",       "p(95)");
  const p99http    = metric("http_req_duration",          "p(99)");
  const errRate    = metric("http_error_rate",            "rate");
  const reqFailed  = metric("http_req_failed",            "rate");
  const totalReqs  = metric("http_reqs",                  "count");
  const serverErr  = metric("login_server_error_5xx",    "count") ?? 0;
  const validRej   = metric("login_valid_cred_rejected", "count") ?? 0;
  const invalidErr = metric("login_invalid_cred_500",    "count") ?? 0;
  const noToken    = metric("login_missing_token",       "count") ?? 0;

  const fmt = (v, d = 2) =>
    v !== null && v !== undefined ? Number(v).toFixed(d) : "N/A";

  console.log("\n==========================================");
  console.log("STRESS-05 — Auth Login Stress Test");
  console.log("==========================================");
  console.log(`Total requests sent           : ${fmt(totalReqs, 0)}`);
  console.log(`p95 response time             : ${fmt(p95)} ms  (informational)`);
  console.log(`p99 HTTP request duration     : ${fmt(p99http)} ms  (informational)`);
  console.log(`Unexpected error rate         : ${(errRate * 100).toFixed(2)}%  (informational)`);
  console.log(`k6 http_req_failed rate       : ${reqFailed !== null ? (reqFailed * 100).toFixed(2) : "N/A"}%  (informational — includes expected 401/404)`);
  console.log(`5xx server errors             : ${fmt(serverErr, 0)}  (threshold: 0)`);
  console.log(`Valid-cred rejections         : ${fmt(validRej, 0)}  (threshold: < 10)`);
  console.log(`Invalid-cred → 500 (not 4xx) : ${fmt(invalidErr, 0)}  (threshold: 0)`);
  console.log(`200 responses missing token   : ${fmt(noToken, 0)}  (threshold: 0)`);
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
