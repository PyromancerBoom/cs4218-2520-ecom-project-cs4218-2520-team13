# Spike Tests — Virtual Vault E-Commerce API

Spike tests measure how the system handles **sudden, dramatic traffic increases** — not gradual load growth.
These differ from load tests: the focus is on burst tolerance, error rate during the spike, and recovery speed.

## Prerequisites

1. **Install k6**: https://grafana.com/docs/k6/latest/set-up/install-k6/
   ```
   # Windows (winget)
   winget install k6 --source winget

   # macOS
   brew install k6
   ```

2. **Start the server** (with a real MongoDB instance):
   ```
   npm run server
   # Server runs on http://localhost:6060 by default
   ```

3. Ensure the database has **seed data** (categories and products) for browsing/category tests.

---

## Test Files

| File | Scenario | Peak VUs | Duration |
|------|----------|----------|----------|
| `flash-sale-spike.js` | Flash sale product browsing surge | 150 | ~100s |
| `login-surge-spike.js` | Login surge at event start | 150 | ~100s |
| `search-spike.js` | Viral search traffic spike | 80 | ~110s |
| `category-spike.js` | Category-specific promotion spike | 80 | ~110s |
| `checkout-spike.js` | Checkout / payment spike | 40 | ~110s |
| `full-scenario-spike.js` | Combined realistic flash sale | ~120 combined | ~110s |

---

## Running Tests

### Run a single scenario
```bash
k6 run tests/spike/flash-sale-spike.js
k6 run tests/spike/login-surge-spike.js
k6 run tests/spike/search-spike.js
k6 run tests/spike/category-spike.js
k6 run tests/spike/checkout-spike.js
k6 run tests/spike/full-scenario-spike.js
```

### Override the base URL (for staging or CI environments)
```bash
k6 run --env BASE_URL=http://staging.example.com:6060 tests/spike/flash-sale-spike.js
```

### Export results to JSON for Grafana / analysis
```bash
mkdir -p results
k6 run --out json=results/flash-sale-spike.json tests/spike/flash-sale-spike.js
```

### Run with Grafana Cloud k6 (for team dashboards)
```bash
k6 run --out cloud tests/spike/full-scenario-spike.js
```

### Enable payment spike testing (requires Braintree sandbox credentials in .env)
```bash
k6 run --env ENABLE_PAYMENT_SPIKE=true tests/spike/checkout-spike.js
```

### Use a specific trending search keyword
```bash
k6 run --env TRENDING_KEYWORD=laptop tests/spike/search-spike.js
```

---

## Understanding Results

k6 outputs a summary table at the end. Key metrics to review:

| Metric | What it means | Target |
|--------|---------------|--------|
| `http_req_failed` | % of requests that failed (non-2xx) | < 5% (< 1% for payment) |
| `http_req_duration p(95)` | 95th percentile response time | < 3000ms |
| `http_req_duration p(99)` | 99th percentile response time | < 5000ms |
| `login_success_rate` | % of valid logins that succeeded | > 95% |
| `checkout_error_rate` | % of checkout requests that errored | < 2% |

**Pass / Fail**: A test run fails if any threshold is breached. k6 exits with code 99.

---

## Spike Pattern Explained

```
VUs
150 |          ████████████
    |         █            █
 5  |█████████              █████████████
    └──────────────────────────────────── time
    30s  35s  40s          70s  75s  105s
    (baseline) (spike up) (spike) (drop) (recovery)
```

- **Baseline**: establishes normal-traffic behaviour as a reference point
- **Ramp up (5 s)**: extremely fast — this is what distinguishes spike from load tests
- **Sustained spike**: verifies the system can hold under peak for 30 s
- **Drop**: immediate traffic reduction
- **Recovery**: confirms the system returns to normal after the spike

---

## Helpers

| File | Purpose |
|------|---------|
| `helpers/config.js` | Base URL, spike stage profiles, threshold definitions |
| `helpers/auth.js` | User registration, login, token management utilities |
| `helpers/generators.js` | Random data generators (keywords, pages, filter payloads) |
