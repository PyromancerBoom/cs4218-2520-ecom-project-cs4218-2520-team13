// Lim Yik Seng, A0338506B
// Spike test: login endpoint under sudden surge (e.g. flash sale start).
// 80% valid logins, 20% wrong password. Peaks at 500 VUs.
// Login is bcrypt-heavy so it degrades faster than other endpoints under load.

import http from "k6/http";
import { check, sleep } from "k6";
import { Counter, Rate } from "k6/metrics";
import { API_BASE, JSON_HEADERS, SPIKE_STAGES, THRESHOLDS } from "./helpers/config.js";
import { createTestUsers } from "./helpers/auth.js";
import { randomCredentials } from "./helpers/generators.js";

// How many unique test users to pre-create before the spike
const NUM_TEST_USERS = 50;

const loginSuccessRate = new Rate("login_success_rate");
const loginFailures = new Counter("login_failures");
const invalidLoginCount = new Counter("invalid_login_attempts");

export const options = {
  stages: SPIKE_STAGES.SHARP_SPIKE,

  thresholds: {
    ...THRESHOLDS.STRICT,
    http_req_failed: ["rate<0.25"], // Including the expected 20% invalid attempts, failure rate should stay below 25%
    login_success_rate: ["rate>0.95"],  // Login success rate must stay above 95% even during spike
  },
};

// Creates 50 test users before the spike and returns their credentials.
export function setup() {
  console.log(`[setup] Creating ${NUM_TEST_USERS} test users...`);
  const credentials = createTestUsers(NUM_TEST_USERS, "loginsurge");
  console.log(`[setup] Created ${credentials.length} users successfully.`);

  if (credentials.length === 0) {
    console.warn(
      "[setup] WARNING: No test users created. " +
      "Ensure the server is running and the DB is accessible."
    );
  }

  return { credentials };
}

// Each VU attempts a login: 80% with correct credentials, 20% with wrong password.
export default function (data) {
  const { credentials } = data;

  if (credentials.length === 0) {
    sleep(1);
    return;
  }

  const cred = randomCredentials(credentials);
  const isInvalidAttempt = Math.random() < 0.2; // 20% invalid attempts

  let payload;
  if (isInvalidAttempt) {
    // Wrong password — intentionally bad credential
    payload = { email: cred.email, password: "WrongP@ssword99" };
  } else {
    payload = { email: cred.email, password: cred.password };
  }

  const res = http.post(
    `${API_BASE}/auth/login`,
    JSON.stringify(payload),
    {
      headers: { ...JSON_HEADERS, "x-loadtest-bypass": "true" },
      tags: { endpoint: "login" },
    }
  );

  if (isInvalidAttempt) {
    // Invalid attempts should return 404 (user not found) or 401/400
    check(res, {
      "invalid-login: status is 4xx": (r) =>
        r.status >= 400 && r.status < 500,
    });
    invalidLoginCount.add(1);
  } else {
    const ok = check(res, {
      "valid-login: status 200": (r) => r.status === 200,
      "valid-login: returns token": (r) => {
        try {
          return typeof r.json("token") === "string";
        } catch (_) {
          return false;
        }
      },
      "valid-login: returns user object": (r) => {
        try {
          return r.json("user") !== null;
        } catch (_) {
          return false;
        }
      },
    });

    loginSuccessRate.add(ok);
    if (!ok) loginFailures.add(1);
  }

  // Short think time to simulate user reading page after login
  sleep(Math.random() * 0.5 + 0.2);
}

// Logs a summary after the test finishes.
export function teardown(data) {
  console.log(
    `[teardown] Login surge test complete. ` +
    `Used ${data.credentials.length} test accounts.`
  );
}
