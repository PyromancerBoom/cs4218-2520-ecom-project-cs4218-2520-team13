// Lim Yik Seng, A0338506B
// Shared config for all spike tests: base URL, stage profiles, thresholds.

// Allow BASE_URL to be overridden at runtime: k6 run --env BASE_URL=http://staging:6060 ...
export const BASE_URL = __ENV.BASE_URL || "http://localhost:6060";
export const API_BASE = `${BASE_URL}/api/v1`;

// Common HTTP headers for JSON API calls
export const JSON_HEADERS = {
  "Content-Type": "application/json",
};

// Stage profiles for different spike scenarios.
// SHARP_SPIKE: 5 to 500 VUs, fast ramp (5s)
// MODERATE_SPIKE: 5 to 400 VUs, slower ramp (10s)
// PAYMENT_SPIKE: 3 to 150 VUs, slower ramp (10s), lower ceiling for payment endpoints
export const SPIKE_STAGES = {
  SHARP_SPIKE: [
    { duration: "30s", target: 5 },   // Baseline: establish normal traffic
    { duration: "5s", target: 500 },  // Spike up: simulate flash-sale launch
    { duration: "30s", target: 500 }, // Sustained spike: measure system under stress
    { duration: "5s", target: 5 },    // Spike down: traffic drops
    { duration: "30s", target: 5 },   // Recovery: verify system stabilises
  ],

  MODERATE_SPIKE: [
    { duration: "30s", target: 5 },
    { duration: "10s", target: 400 },
    { duration: "30s", target: 400 },
    { duration: "10s", target: 5 },
    { duration: "30s", target: 5 },
  ],

  PAYMENT_SPIKE: [
    { duration: "30s", target: 3 },
    { duration: "10s", target: 150 },
    { duration: "30s", target: 150 },
    { duration: "10s", target: 3 },
    { duration: "30s", target: 3 },
  ],
};

// Threshold presets.
// STANDARD: for general endpoints (browsing, search, categories)
// STRICT: for login, tighter response time requirement
// PAYMENT: for payment endpoints, higher latency tolerance but near-zero errors
export const THRESHOLDS = {
  STANDARD: {
    // No more than 2% of requests should fail during a spike
    http_req_failed: ["rate<0.02"],
    // 95th percentile must stay under 3 s during the spike window
    http_req_duration: ["p(95)<3000"],
    // Median response under 1 s even during spike
    "http_req_duration{phase:baseline}": ["p(50)<500"],
  },

  STRICT: {
    http_req_failed: ["rate<0.02"],   // Login must stay reliable — < 2% error
    http_req_duration: ["p(95)<2000"],
    "http_req_duration{phase:baseline}": ["p(50)<300"],
  },

  PAYMENT: {
    http_req_failed: ["rate<0.01"],   // Payment errors are business-critical — < 1%
    http_req_duration: ["p(95)<1000"],
    "http_req_duration{phase:baseline}": ["p(50)<500"],
  },
};

// Returns the current phase ("baseline", "spike", or "recovery") based on elapsed time.
// Used to tag metrics so results can be filtered by phase.
export function getPhaseTag(elapsed, stages) {
  const baselineDuration = parseInt(stages[0].duration);
  const spikeEnd =
    baselineDuration +
    parseInt(stages[1].duration) +
    parseInt(stages[2].duration);

  if (elapsed < baselineDuration) return "baseline";
  if (elapsed <= spikeEnd) return "spike";
  return "recovery";
}
