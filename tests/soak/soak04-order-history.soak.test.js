// Priyansh Bimbisariye, A0265903B

import http from "k6/http";
import { check, group, sleep } from "k6";
import { SharedArray } from "k6/data";

import { BASE_URL } from "./helpers/config.js";
import { getPhase } from "./helpers/phases.js";
import { login } from "./helpers/auth.js";
import {
  ordersLatency,
  ordersResponseSize,
  totalErrors,
} from "./helpers/metrics.js";

const users = new SharedArray("soak_users", function () {
  return open("./users.csv")
    .split("\n")
    .slice(1)
    .map((line) => {
      const parts = line.split(",");
      return { email: parts[1]?.trim(), password: parts[2]?.trim() };
    })
    .filter((u) => u.email && u.password);
});

export const options = {
  scenarios: {
    orderHistory: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "2m", target: 5 },
        { duration: "9m", target: 5 },
        { duration: "1m", target: 0 },
      ],
      gracefulRampDown: "30s",
      exec: "orderHistoryScenario",
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.02"],
    soak_orders_latency: ["p(95)<2000"],
    "soak_orders_latency{phase:late}": ["p(95)<3000"],
    "soak_orders_response_size{phase:late}": ["p(95)<512000"],
    soak_total_errors: ["count<100"],
  },
};

// Priyansh Bimbisariye, A0265903B
export function orderHistoryScenario() {
  const phase = getPhase();
  const user = users[Math.floor(Math.random() * users.length)];

  const { res: loginRes, token } = login(user, phase);

  if (loginRes.status !== 200 || !token) {
    totalErrors.add(1);
    sleep(5);
    return;
  }

  sleep(1);

  // Priyansh Bimbisariye, A0265903B
  group("Soak_Orders: Fetch order history", function () {
    const res = http.get(`${BASE_URL}/auth/orders`, {
      headers: { Authorization: token },
      tags: { name: "Soak_Orders", phase },
    });

    ordersLatency.add(res.timings.duration, { phase });
    ordersResponseSize.add(res.body ? res.body.length : 0, { phase });

    if (res.status !== 200) totalErrors.add(1);

    check(res, {
      "orders returns 200": (r) => r.status === 200,
      "orders is valid JSON": (r) => {
        try {
          JSON.parse(r.body);
          return true;
        } catch (_e) {
          return false;
        }
      },
      "orders latency < 3s": (r) => r.timings.duration < 3000,
      "orders body < 500 KB": (r) => (r.body ? r.body.length : 0) < 512000,
    });
  });

  sleep(Math.random() * 10 + 5);
}
