// Lim Yik Seng, A0338506B
// Auth helpers for spike tests: register, login, and create test users in setup().

import http from "k6/http";
import { check, sleep } from "k6";
import { API_BASE, JSON_HEADERS } from "./config.js";

// Registers a new user and returns { success, status }.
export function registerUser(userData) {
  const res = http.post(
    `${API_BASE}/auth/register`,
    JSON.stringify(userData),
    { headers: JSON_HEADERS }
  );

  const ok = check(res, {
    "register: status 201": (r) => r.status === 201,
  });

  return { success: ok, status: res.status };
}

// Logs in and returns the JWT token, or null if login fails.
export function login(email, password) {
  const res = http.post(
    `${API_BASE}/auth/login`,
    JSON.stringify({ email, password }),
    { headers: { ...JSON_HEADERS, "x-loadtest-bypass": "true" } }
  );

  if (res.status === 200) {
    try {
      return res.json("token");
    } catch (_) {
      return null;
    }
  }
  return null;
}

// Returns headers with Authorization set, for authenticated requests.
export function authHeaders(token) {
  return {
    ...JSON_HEADERS,
    Authorization: token,
  };
}

// Creates N test users and returns their credentials. Meant to run in setup() before the spike.
export function createTestUsers(count, prefix = "spikeuser") {
  const timestamp = Date.now();
  const password = "SpikeTe5t!Pass";
  const credentials = [];

  for (let i = 0; i < count; i++) {
    const email = `${prefix}_${timestamp}_${i}@spike.test`;
    const userData = {
      name: `Spike User ${i}`,
      email,
      password,
      phone: `8${String(10000000 + i).slice(1)}`, // valid 8-digit SG-style number
      address: `${i + 1} Spike Street, TestCity`,
      answer: "spike-security-answer",
    };

    const result = registerUser(userData);
    if (result.success) {
      credentials.push({ email, password });
    }
    // Brief pause between registrations to avoid overwhelming setup phase.
    // setup() is single-threaded in k6, so sleep() blocks until it completes.
    sleep(0.2);
  }

  return credentials;
}
