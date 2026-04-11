// Lim Yik Seng, A0338506B
// Shared config for all spike tests: base URL, stage profiles, thresholds.

// Allow BASE_URL to be overridden at runtime: k6 run --env BASE_URL=http://staging:6060 ...
export const BASE_URL = __ENV.BASE_URL || "http://localhost:6060";
export const API_BASE = `${BASE_URL}/api/v1`;

// Common HTTP headers for JSON API calls
export const JSON_HEADERS = {
  "Content-Type": "application/json",
};

// Builds a standard 5-stage spike profile for a given peak VU count.
// rampDuration: "5s" for sharp spikes, "10s" for more gradual ones.
export function buildSpike(peak, rampDuration = "5s") {
  const baseline = Math.max(3, Math.ceil(peak * 0.01));  // Baseline at 1% of peak, minimum 3 VUs to keep the server active
  return [
    { duration: "30s", target: baseline },   // Baseline: establish normal traffic
    { duration: rampDuration, target: peak }, // Spike up
    { duration: "30s", target: peak },        // Sustained spike
    { duration: rampDuration, target: baseline }, // Spike down
    { duration: "30s", target: baseline },    // Recovery
  ];
}

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
