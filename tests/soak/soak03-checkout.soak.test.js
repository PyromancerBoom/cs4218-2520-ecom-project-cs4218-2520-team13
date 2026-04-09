// Priyansh Bimbisariye, A0265903B

import http from "k6/http";
import { check, group, sleep } from "k6";
import { SharedArray } from "k6/data";
import { randomItem } from "https://jslib.k6.io/k6-utils/1.2.0/index.js";
import exec from "k6/execution";

import { BASE_URL, DB_PRODUCTS, VALID_NONCES } from "./helpers/config.js";
import { getPhase } from "./helpers/phases.js";
import { login } from "./helpers/auth.js";
import {
  checkoutLatency,
  totalErrors,
  paymentAttempts,
  paymentSuccesses,
} from "./helpers/metrics.js";

const users = new SharedArray("soak_users", function () {
  return open("./users.csv")
    .split("\n")
    .slice(1)
    .map((line) => {
      const parts = line.split(",");
      return { email: parts[1]?.trim(), password: parts[2]?.trim() };
    })
    .filter((user) => user.email && user.password);
});

// Priyansh Bimbisariye, A0265903B
export const options = {
  scenarios: {
    checkout: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "2m", target: 10 },
        { duration: "9m", target: 10 },
        { duration: "1m", target: 0 },
      ],
      gracefulRampDown: "30s",
      exec: "checkoutScenario",
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.02"],
    soak_checkout_latency: ["p(95)<3000", "p(99)<5000"],
    "soak_checkout_latency{phase:late}": ["p(95)<4000"],
    soak_total_errors: ["count<100"],
  },
};

function uniquePrice(vuId, iter) {
  const timeSalt = Math.floor(Date.now() / 1000) % 1000;
  return Number((10 + vuId + ((iter + timeSalt) % 100) * 0.01).toFixed(2));
}

// Priyansh Bimbisariye, A0265903B
export function checkoutScenario() {
  const phase = getPhase();
  const user = users[Math.floor(Math.random() * users.length)];

  sleep(Math.random() * 2 + 1);

  const { res: loginRes, token } = login(user, phase);
  checkoutLatency.add(loginRes.timings.duration, { phase });

  if (loginRes.status !== 200 || !token) {
    totalErrors.add(1);
    sleep(3);
    return;
  }

  check(loginRes, {
    "login returns 200": (r) => r.status === 200,
    "login returns a non-empty token": () => !!token,
  });

  sleep(Math.random() * 3 + 1);

  // Priyansh Bimbisariye, A0265903B
  group("Soak_Checkout: Braintree Token", function () {
    const tokenRes = http.get(`${BASE_URL}/product/braintree/token`, {
      tags: { name: "Soak_BraintreeToken", phase },
    });
    checkoutLatency.add(tokenRes.timings.duration, { phase });
    if (tokenRes.status !== 200) totalErrors.add(1);

    check(tokenRes, {
      "braintree token returns 200": (r) => r.status === 200,
      "braintree token is non-empty": (r) => r.body && r.body.length > 0,
    });
  });

  sleep(Math.random() * 2 + 1);

  // Priyansh Bimbisariye, A0265903B
  group("Soak_Checkout: Payment", function () {
    paymentAttempts.add(1);

    const vuId = exec.vu.idInTest;
    const iter = exec.vu.iterationInInstance;

    const numItems = Math.floor(Math.random() * 3) + 1;
    const cart = [];
    for (let i = 0; i < numItems; i++) {
      const p = randomItem(DB_PRODUCTS);
      cart.push({
        _id: p.pid,
        price: uniquePrice(vuId, iter + i),
        name: p.name,
      });
    }

    const paymentRes = http.post(
      `${BASE_URL}/product/braintree/payment`,
      JSON.stringify({ nonce: randomItem(VALID_NONCES), cart }),
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: token,
        },
        tags: { name: "Soak_Payment", phase },
      },
    );

    checkoutLatency.add(paymentRes.timings.duration, { phase });
    if (paymentRes.status !== 200) totalErrors.add(1);

    const paymentOk = check(paymentRes, {
      "payment returns 200": (r) => r.status === 200,
      "payment ok=true": (r) => {
        try {
          return r.json("ok") === true;
        } catch (_e) {
          return false;
        }
      },
    });

    if (paymentOk) {
      paymentSuccesses.add(1);
    }
  });

  sleep(Math.random() * 5 + 3);
}
