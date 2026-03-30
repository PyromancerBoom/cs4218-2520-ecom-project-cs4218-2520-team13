# MS3 Security Testing Guide
Branch: `lws49-ms3`

---

## What Was Built

77 automated security tests across 12 test files in `tests/security/`.
Run them all with: `npm run test:security`

Expected result: **11 failed, 66 passed, 77 total**
The 11 failures are intentional — they are confirmed security findings.

### Test files and what they cover

| File | Story | What it checks |
|------|-------|----------------|
| `auth.jwt.security.test.js` | AUTH-01/02 | Expired tokens and tampered JWT signatures are rejected |
| `auth.hardening.security.test.js` | AUTH-03 | Login injection resistance; email enumeration vulnerability |
| `auth.ratelimit.security.test.js` | AUTH-04 | Brute-force rate limiting (FAIL = no rate limiter found) |
| `authz.admin.security.test.js` | AUTHZ-01 | Admin endpoints block regular users |
| `authz.idor.security.test.js` | AUTHZ-02 | User A cannot see User B's orders |
| `authz.massassign.security.test.js` | AUTHZ-03 | Registering with `role:1` does not grant admin |
| `authz.bizlogic.security.test.js` | AUTHZ-04 | Order status can only be changed by admin |
| `inj.query.security.test.js` | INJ-01 | Product filter endpoint resists NoSQL operator injection |
| `data.exposure.security.test.js` | DATA-01 | Password field never appears in any API response |
| `data.errors.security.test.js` | DATA-02 | Error responses do not leak stack traces or MongoError details |
| `config.cors.security.test.js` | CONFIG-01 | CORS policy does not use wildcard (FAIL = wildcard found) |
| `config.headers.security.test.js` | CONFIG-02 | Security headers present (FAIL = no helmet found) |

---

## Confirmed Security Findings

| Story | Severity | OWASP | Finding | Remediation |
|-------|----------|-------|---------|-------------|
| AUTH-03e | Medium | A07 | Email enumeration — login returns different messages for unknown email vs wrong password | Unify error message to a single generic response |
| AUTH-04 | Medium | A07 | No rate limiting on POST /api/v1/auth/login — CWE-307 | `npm install express-rate-limit`, apply before auth routes |
| CONFIG-01 | Medium | A05 | CORS wildcard — `cors()` with no options → `Access-Control-Allow-Origin: *` | `app.use(cors({ origin: process.env.CLIENT_URL \|\| 'http://localhost:3000' }))` |
| CONFIG-02 | Low | A05 | No security headers — X-Content-Type-Options missing, X-Powered-By exposed | `npm install helmet` then `app.use(helmet())` in server.js |
| DATA-02 | Low | A05 | Raw `error` object in 500 responses — V8 doesn't serialize `stack` by default but it's fragile | Replace `error` with `error.message` in all catch blocks |

---

## Running the Tests

### Full suite
```bash
npm run test:security
```

### Full suite with verbose output (see each test name)
```bash
npm run test:security -- --verbose 2>&1 | grep -E "✓|×|PASS|FAIL|Tests:"
```

### By epic
```bash
npm run test:security -- --testPathPattern="auth\.(jwt|hardening|ratelimit)"
npm run test:security -- --testPathPattern="authz\."
npm run test:security -- --testPathPattern="inj\."
npm run test:security -- --testPathPattern="data\."
npm run test:security -- --testPathPattern="config\."
```

### Single file
```bash
npm run test:security -- --testPathPattern="auth.ratelimit"
```

---

## Semgrep SAST

Custom Semgrep rules are in `docs/security/semgrep-rules/` (gitignored, local only).

Run against controllers:
```bash
npx @semgrep/semgrep scan \
  --config docs/security/semgrep-rules/findbyidandupdate-no-validators.yaml \
  --config docs/security/semgrep-rules/raw-error-serialization.yaml \
  controllers/
```

Expected findings:
- `raw-error-object-in-response` — 38 hits (every controller uses `{ error }` shorthand in catch blocks)
- `findbyidandupdate-missing-runvalidators` — 3 real hits (`authController.js:188`, `categoryController.js:45`, `productController.js:185`)

Run the full auto ruleset (takes ~1 min, downloads rules on first run):
```bash
npx @semgrep/semgrep scan --config auto controllers/
```

---

## OWASP ZAP DAST

Requires: Docker, MongoDB running locally.

```bash
# 1. Start the app (use dummy Braintree keys since they're not in .env)
BRAINTREE_MERCHANT_ID=dummy BRAINTREE_PUBLIC_KEY=dummy BRAINTREE_PRIVATE_KEY=dummy node server.js &

# 2. Wait for: "Server running on development mode on 6060"

# 3. Run ZAP baseline scan (passive only, ~2 min)
docker run --rm \
  -v $(pwd)/docs/security:/zap/wrk:rw \
  ghcr.io/zaproxy/zaproxy:stable \
  zap-baseline.py -t http://host.docker.internal:6060

# 4. Stop the server
kill $(lsof -ti:6060)
```

Expected results: **8 WARN-NEW, 0 FAIL-NEW**

Key WARN alerts that match supertest findings:
- `[10021]` X-Content-Type-Options Missing → CONFIG-02
- `[10037]` Server leaks X-Powered-By → CONFIG-02
- `[10098]` Cross-Domain Misconfiguration (CORS wildcard) → CONFIG-01

Full triage saved to: `docs/security/zap-baseline-findings.md`

---

## Generating Report Charts

```bash
python3 generate_security_report.py
```

Outputs:
- Printed findings table to stdout
- `docs/security/security_report_charts/chart1_tests_by_epic.png`
- `docs/security/security_report_charts/chart2_findings_severity.png`
- `docs/security/security_report_charts/chart3_owasp_coverage.png`

If matplotlib is missing: `pip3 install matplotlib`

---

## Numbers for Your Report

| Metric | Value |
|--------|-------|
| Total automated security tests | 77 |
| Tests passing (controls verified) | 66 |
| Tests failing (findings confirmed) | 11 |
| Test suites | 12 |
| Distinct vulnerabilities found | 4 confirmed + 1 risk (DATA-02) |
| OWASP Top 10 categories covered | 6 (A01, A02, A03, A05, A06, A07) |
| Semgrep rules written | 2 custom |
| Semgrep findings (raw-error) | 38 instances across 3 controllers |
| ZAP WARN alerts | 8 |
| ZAP FAIL alerts | 0 |

### OWASP coverage breakdown

| Category | Stories covering it |
|----------|-------------------|
| A01 Broken Access Control | 3 (AUTHZ-01, AUTHZ-02, AUTHZ-03/04) |
| A02 Cryptographic Failures | 1 (DATA-01) |
| A03 Injection | 2 (AUTH-03 injection payloads, INJ-01) |
| A05 Security Misconfiguration | 4 (DATA-02, CONFIG-01, CONFIG-02, CONFIG-04) |
| A06 Vulnerable Components | 1 (CONFIG-03 Semgrep) |
| A07 Auth Failures | 4 (AUTH-01, AUTH-02, AUTH-03, AUTH-04) |

### Test infrastructure narrative

- **Framework**: Jest + Supertest + mongodb-memory-server (no real DB required)
- **SAST**: Semgrep with 2 custom YAML rules targeting Mongoose-specific anti-patterns
- **DAST**: OWASP ZAP Docker baseline scan (passive scanning, no active attacks)
- **Approach**: Tests are written to FAIL when a vulnerability exists and PASS when the control works correctly. Findings are self-documenting — the SECURITY FINDING comment block in each failing test contains the OWASP mapping, CWE ID, CVSS score, and remediation.

---

## Understanding a Specific Finding (Worked Example)

To understand AUTH-04 (rate limiting):

1. Read the test: `cat tests/security/auth.ratelimit.security.test.js`
   - It sends 20 concurrent login attempts
   - Expects at least one 429 response
   - The SECURITY FINDING comment documents CWE-307, CVSS 5.3, and the express-rate-limit fix

2. Run it: `npm run test:security -- --testPathPattern="auth.ratelimit"`
   - FAIL: 0 out of 20 got 429 → no rate limiter exists

3. Read the vulnerable code: `grep -n "login\|rate" server.js routes/authRoute.js`
   - No rate limiter middleware before the login route

4. The remediation (NOT done — findings are documented, not fixed):
   ```js
   import rateLimit from 'express-rate-limit';
   const loginLimiter = rateLimit({
     windowMs: 15 * 60 * 1000,
     max: 10,
     message: { success: false, message: 'Too many login attempts, try again later.' },
   });
   app.use('/api/v1/auth/login', loginLimiter);
   ```

Same pattern applies to all other FAIL tests.

---

## Commit History (for reference)

```
7abed3e feat(security): add security report generator
26527cd test(security): CONFIG-01 CORS policy and CONFIG-02 security headers
6de4ce3 fix(security): DATA-02 correct misleading test name
5c2b29f test(security): DATA-02 error response sanitization
ee75fbd fix(security): DATA-01 simplify sensitive field helper
a288b2d test(security): DATA-01 sensitive field exclusion across all endpoints
dbb7152 fix(security): INJ-01 add baseline count guard in beforeAll
a325ea6 test(security): INJ-01 NoSQL injection on product query endpoints
5e977ec fix(security): AUTHZ-04 strengthen invalid enum assertion
163565b test(security): AUTHZ-03 mass assignment and AUTHZ-04 business logic
37e9548 test(security): AUTHZ-02 IDOR order isolation
9eabe84 fix(security): AUTHZ-01 add missing no-token and admin acceptance tests
dafde24 test(security): AUTHZ-01 admin endpoint isolation
1f4f076 test(security): AUTH-04 rate limiting assessment - finding CWE-307
5574fe4 fix(security): fix AUTH-03d false negatives
a71e98c fix(security): improve AUTH-03 test isolation
b7eb41b test(security): AUTH-03 authentication endpoint hardening
0a8d06e fix(security): address code review issues in auth.jwt
8292c44 test(security): AUTH-01 JWT expiry and AUTH-02 signature validation
b558e52 test(security): exclude tests/security/ from jest.backend.config
e281f06 test(security): add jest.security.config and injection payload library
```
