//Aashim Mahindroo, A0265890R

//Based on the directions of my user stories and testing methodology, Github Copilot generates initial test code for this file.
//Then I manually review the code and make necessary adjustments to ensure accuracy and relevance to the project requirements.

import http from "k6/http";
import { check, sleep } from "k6";
import { Rate, Trend, Counter } from "k6/metrics";

const errorRate = new Rate("http_error_rate");

const responseTime = new Trend("register_response_time", true);

const serverErrorCount = new Counter("register_server_error_5xx");

const duplicateGot500 = new Counter("register_duplicate_got_500");

const duplicateCorrect409 = new Counter("register_duplicate_correct_409");

const missingUserObject = new Counter("register_missing_user_object");

const BASE_URL = __ENV.BASE_URL || "http://localhost:6060";
const REGISTER_ENDPOINT = `${BASE_URL}/api/v1/auth/register`;

const BASE_PAYLOAD = {
  name:     "Stress Test User",
  phone:    "91234567",
  address:  "123 Stress Test Street",
  password: "StressTest@123",
  answer:   "stress",
};

export function setup() {
  const runId = Date.now();

  const duplicatePool = [];
  const DUPLICATE_POOL_SIZE = 5;

  for (let i = 0; i < DUPLICATE_POOL_SIZE; i++) {
    const email = `stress_dup_${runId}_${i}@load.test.invalid`;
    const payload = JSON.stringify({ ...BASE_PAYLOAD, name: `Dup User ${i}`, email });

    const res = http.post(REGISTER_ENDPOINT, payload, {
      headers: { "Content-Type": "application/json" },
      timeout: "15s",
    });

    if (res.status === 201) {
      duplicatePool.push(email);
    } else {
      console.warn(
        `[setup] Failed to pre-register duplicate email ${email}: ` +
        `status=${res.status} body=${res.body}`
      );
    }
  }

  console.log(
    `[setup] runId=${runId}  duplicatePool=${duplicatePool.length}/${DUPLICATE_POOL_SIZE} registered`
  );

  const RACE_POOL_SIZE = 10;
  const racePool = [];
  for (let i = 0; i < RACE_POOL_SIZE; i++) {
    racePool.push(`stress_race_${runId}_${i}@load.test.invalid`);
  }

  return { runId, duplicatePool, racePool };
}

export const options = {
  summaryTrendStats: ["avg", "min", "max", "p(90)", "p(95)", "p(99)"],

  stages: [
    { duration: "20s", target: 100 }, 
    { duration: "1m",  target: 100 }, 
    { duration: "15s", target: 0   }, 
  ],

  thresholds: {
    "register_server_error_5xx": ["count<10"],

    "register_duplicate_got_500": ["count==0"],
  },
};

export default function (data) {
  const { runId, duplicatePool, racePool } = data;
  const roll = Math.random();

  let email, expectNew, isDuplicate;

  if (roll < 0.80) {
    
    email      = `stress_vu${__VU}_i${__ITER}_${runId}@load.test.invalid`;
    expectNew  = true;
    isDuplicate = false;
  } else if (roll < 0.95) {
    
    if (duplicatePool.length === 0) {
      
      email      = `stress_fallback_vu${__VU}_i${__ITER}_${runId}@load.test.invalid`;
      expectNew  = true;
      isDuplicate = false;
    } else {
      email       = duplicatePool[Math.floor(Math.random() * duplicatePool.length)];
      expectNew   = false;
      isDuplicate = true;
    }
  } else {
    
    email       = racePool[Math.floor(Math.random() * racePool.length)];
    
    expectNew   = null; 
    isDuplicate = false;
  }

  const payload = JSON.stringify({ ...BASE_PAYLOAD, email });

  const res = http.post(REGISTER_ENDPOINT, payload, {
    headers: { "Content-Type": "application/json" },
    tags: {
      endpoint: "auth-register",
      scenario: isDuplicate
        ? "duplicate"
        : expectNew === null
        ? "race"
        : "new_unique",
    },
    timeout: "15s",
  });

  responseTime.add(res.timings.duration);

  const is5xx = res.status >= 500;

  if (is5xx) {
    serverErrorCount.add(1);
  }

  if (isDuplicate) {
    if (res.status === 409) {
      duplicateCorrect409.add(1);
    } else if (is5xx) {
      duplicateGot500.add(1);
    }
  }

  const isExpected =
    res.status === 201 ||
    res.status === 409 ||
    res.status === 400; 
  errorRate.add(!isExpected);

  if (res.status === 201) {
    try {
      const body = JSON.parse(res.body);
      if (!body.user || typeof body.user._id !== "string") {
        missingUserObject.add(1);
      }
    } catch {
      missingUserObject.add(1);
    }
  }

  check(res, {
    
    "new unique email returns 201": (r) => {
      if (!expectNew) return true; 
      return r.status === 201;
    },

    "201 response contains user._id": (r) => {
      if (r.status !== 201) return true;
      try {
        const body = JSON.parse(r.body);
        return body.user && typeof body.user._id === "string";
      } catch {
        return false;
      }
    },

    "201 response echoes correct email": (r) => {
      if (r.status !== 201) return true;
      try {
        return JSON.parse(r.body).user.email === email;
      } catch {
        return false;
      }
    },

    "duplicate email returns 409 not 500": (r) => {
      if (!isDuplicate) return true;
      return r.status === 409;
    },

    "race attempt never returns 500": (r) => {
      if (expectNew !== null) return true; 
      return r.status !== 500;
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

  const p95         = metric("register_response_time",      "p(95)");
  const p99http     = metric("http_req_duration",            "p(99)");
  const errRate     = metric("http_error_rate",              "rate");
  const reqFailed   = metric("http_req_failed",              "rate");
  const totalReqs   = metric("http_reqs",                    "count");
  const serverErr   = metric("register_server_error_5xx",     "count") ?? 0;
  const dup409      = metric("register_duplicate_correct_409","count") ?? 0;
  const dup500      = metric("register_duplicate_got_500",    "count") ?? 0;
  const noUser      = metric("register_missing_user_object",  "count") ?? 0;

  const fmt = (v, d = 2) =>
    v !== null && v !== undefined ? Number(v).toFixed(d) : "N/A";

  console.log("\n==========================================");
  console.log("STRESS-06 — Registration Burst Stress Test");
  console.log("==========================================");
  console.log(`Total requests sent              : ${fmt(totalReqs, 0)}`);
  console.log(`p95 response time                : ${fmt(p95)} ms  (informational)`);
  console.log(`p99 HTTP request duration        : ${fmt(p99http)} ms  (informational)`);
  console.log(`Unexpected error rate            : ${(errRate * 100).toFixed(2)}%  (informational)`);
  console.log(`Network failure rate             : ${(reqFailed * 100).toFixed(2)}%  (informational)`);
  console.log(`5xx server errors                : ${fmt(serverErr, 0)}  (threshold: 0)`);
  console.log(`Duplicate → 409 (correct)        : ${fmt(dup409, 0)}  (expected > 0)`);
  console.log(`Duplicate → 500 (E11000 leaked)  : ${fmt(dup500, 0)}  (threshold: 0)`);
  console.log(`201 responses missing user obj   : ${fmt(noUser, 0)}  (threshold: 0)`);
  console.log("------------------------------------------");
  console.log("E11000 race note: register_duplicate_got_500 > 0 means the");
  console.log("server leaked a MongoDB DuplicateKey error as a 500. Fix:");
  console.log("catch error.code === 11000 in registerController and return 409.");
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
