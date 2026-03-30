# MS3 Individual Report — Low Wei Sheng, A0259272X
# Security Testing (Non-Functional Tests)

---

## PAGE 1 — Security Testing Approach

### Why Security Testing

The ecommerce application handles authentication credentials, user personal data, and payment flows — making it a natural target for injection, broken authentication, and access control vulnerabilities. Three bugs already fixed in MS1 and MS2 involved security-adjacent issues: a bcrypt hash leaked in the profile update response (BUG-01, MS2), enum validation bypassed on order status updates (BUG-02, MS2), and multiple incorrect HTTP status codes that obscured failure modes. This history justified choosing security as the non-functional testing focus for MS3: the codebase had a demonstrated pattern of security-relevant defects.

### Methodology

The testing methodology was structured around OWASP Top 10 2021. Rather than scanning for all possible vulnerabilities, I mapped each OWASP category to the concrete threat surface of this specific application (Express + Mongoose + JWT) and selected one or two stories per category that were most exploitable given the implementation. This produced 14 security user stories across 5 epics:

- **AUTH** — JWT token controls, authentication endpoint hardening, brute-force rate limiting
- **AUTHZ** — Admin endpoint isolation, IDOR across user orders, mass assignment via registration, business logic enforcement
- **INJ** — NoSQL operator injection on product query endpoints
- **DATA** — Sensitive field exclusion from all API responses, error response sanitisation
- **CONFIG** — CORS policy, HTTP security headers, static analysis (Semgrep), dynamic analysis (ZAP)

Tests were written so that **a failing test confirms a vulnerability** and a passing test confirms the control works. This makes the test output self-documenting: the 11 failing tests at first run are the security findings.

### Tools and Rationale

Three layers of testing were applied, each targeting a different detection surface:

**Automated Tests (Jest + Supertest + mongodb-memory-server):** The same infrastructure used in MS1/MS2 was extended. Each security test file runs against a full in-memory Express + MongoDB stack, exercising real middleware chains and real Mongoose queries. This means a test for NoSQL injection exercises the actual Mongoose `findOne` call rather than a mock, ensuring that injection payloads reach the database layer. Tests run in complete isolation — each file gets a fresh app instance, preventing rate-limiter or session state from one file affecting another.

**SAST (Semgrep with custom rules):** Two custom Semgrep rules were written targeting Mongoose-specific anti-patterns: `findByIdAndUpdate` without `runValidators: true` (directly responsible for BUG-02 in MS2) and raw `error` objects in `res.send()` calls (CWE-209 risk). The `findByIdAndUpdate` rule found 3 real hits across the controllers; the raw-error rule found 38 instances. SAST was chosen specifically because it can systematically scan the entire codebase for a pattern class, which is impractical to do manually at scale.

**DAST (OWASP ZAP Baseline Scan):** A passive ZAP scan was run against the live server using Docker. Passive scanning observes HTTP traffic and flags misconfigurations without sending attack traffic — appropriate for a local development environment. The scan produced 8 WARN alerts corroborating three automated test findings: missing X-Content-Type-Options header (CONFIG-02), exposed X-Powered-By (CONFIG-02), and CORS wildcard (CONFIG-01). The convergence between automated tests and ZAP results increases confidence that these are real misconfigurations, not test artefacts.

---

## PAGE 2 — Graphical Test Statistics (MS3)

### Test Distribution by Epic

```
[Chart 1: chart1_tests_by_epic.png]
Bar chart — 5 epics, test counts:
  AUTH (Authentication Security):   28 tests
  AUTHZ (Access Control):           27 tests
  INJ (Injection):                   6 tests
  DATA (Data Protection):           10 tests
  CONFIG (Configuration):            6 tests
  ─────────────────────────────────
  Total:                            77 tests
```

The AUTH and AUTHZ epics account for 71% of tests (55/77) because broken authentication (OWASP A07) and broken access control (OWASP A01) are the top two OWASP categories and are the most directly exploitable in a user-facing application. INJ and CONFIG received fewer tests because the attack surface is narrower: only one product query endpoint accepted structured filter input (INJ), and configuration findings require only one test per header/policy (CONFIG).

### Test Results Summary

| Metric | Value |
|--------|-------|
| Total automated security tests | 77 |
| Tests passing (controls verified) | 66 |
| Tests failing (findings confirmed) | 11 |
| Test suites | 12 |
| Distinct vulnerabilities found | 4 confirmed + 1 risk |
| OWASP Top 10 categories covered | 6 (A01, A02, A03, A05, A06, A07) |
| Semgrep findings (raw-error pattern) | 38 instances across 3 controllers |
| ZAP WARN alerts | 8 |

### Security Findings

```
[Chart 2: chart2_findings_severity.png]
Bar chart — findings by severity:
  High:   0
  Medium: 3 (AUTH-03e, AUTH-04, CONFIG-01)
  Low:    2 (CONFIG-02, DATA-02)
```

| Story | Severity | OWASP | Finding | Status |
|-------|----------|-------|---------|--------|
| AUTH-03e | Medium | A07 | Email enumeration: login returns distinct error for unknown email vs wrong password | FIXED |
| AUTH-04 | Medium | A07 | No rate limiting on POST /api/v1/auth/login (CWE-307) | FIXED |
| CONFIG-01 | Medium | A05 | CORS wildcard — `cors()` with no origin restriction | FIXED |
| CONFIG-02 | Low | A05 | No security headers — X-Content-Type-Options missing, X-Powered-By exposed | FIXED |
| DATA-02 | Low | A05 | Raw `error` object in 500 responses (V8 doesn't serialize stack, but fragile) | DOCUMENTED |

All four confirmed Medium/Low findings were remediated in the same commit: `helmet` and `express-rate-limit` were added in `server.js`, CORS was restricted to `CLIENT_URL`, and the login controller's error messages were unified to `"Invalid email or password"` for both the unknown-email and wrong-password cases. DATA-02 was documented rather than fixed because V8's JSON serializer does not include `stack` or `message` on the `Error` prototype by default, making active exploitation unlikely; however, the pattern is fragile and should be addressed in a future sprint.

### OWASP Coverage

```
[Chart 3: chart3_owasp_coverage.png]
Horizontal bar chart — stories per OWASP category:
  A01 Broken Access Control:     3 stories (AUTHZ-01, AUTHZ-02, AUTHZ-03/04)
  A02 Cryptographic Failures:    1 story  (DATA-01)
  A03 Injection:                 2 stories (AUTH-03 injection, INJ-01)
  A05 Security Misconfiguration: 4 stories (DATA-02, CONFIG-01, CONFIG-02, CONFIG-04)
  A06 Vulnerable Components:     1 story  (CONFIG-03 Semgrep)
  A07 Auth Failures:             4 stories (AUTH-01, AUTH-02, AUTH-03, AUTH-04)
```

---

## PAGE 3 — Group's Progress for AI-Driven Testing (MS3)

### What Was Done

Claude Code (claude-sonnet-4-6) was used as the primary development agent throughout MS3. The workflow was structured using the Subagent-Driven Development pattern: for each of the 14 security user stories, Claude was given the story specification and the relevant production code, then dispatched as an implementer subagent to write the tests. After each task, a spec compliance reviewer subagent checked that the implementation matched the story requirements, followed by a code quality reviewer that checked for dead code, weak assertions, and test isolation issues.

Concrete contributions across the session:
- Wrote all 77 security tests across 12 files without manual coding
- Identified a false negative in AUTHZ-04: the initial `not.toBe(200)` assertion for invalid enum was too weak (a 429 from rate limiting would also pass it), and strengthened it to `toBe(500)` after checking that Mongoose validation errors route to the generic error handler
- Identified a tautological assertion in DATA-01: the initial implementer wrote `if (leak === '.user.__v') { expect(leak).toBe('.user.__v') }` to handle `__v` exposure, which was a vacuous assertion. Claude's spec reviewer flagged this; the fix was to remove `__v` from the sensitive field check (it is a Mongoose version key, not a security credential)
- Designed and wrote two custom Semgrep YAML rules, mapping the `findByIdAndUpdate` anti-pattern (which caused BUG-02) to a static analysis rule that would catch it in future code reviews
- Wrote `generate_security_report.py` to produce the three charts in this report

### How Effective Was It

The AI-driven approach was most effective for two tasks: **comprehensive partition generation** and **false positive resolution**.

For partition generation, Claude systematically enumerated the test cases for each endpoint — not just the happy path, but every boundary the OWASP story implied. For AUTHZ-01 (admin endpoint isolation), 18 tests were generated covering all 6 admin endpoints × 3 auth states (no token, user token, admin token) in a single pass. Manual enumeration of this matrix would be error-prone and slow.

For false positive resolution, the two-stage review (spec then quality) caught issues that the implementer produced. In the DATA-01 case, the implementer produced code that technically passed but was logically hollow. The spec reviewer's mandate to check "does each assertion actually verify the security property?" surfaced the issue. This mirrors the BUG-05 scenario from MS2 (where AI validation of a proposed fix prevented shipping an incorrect change) — the same quality gate pattern applied at the test layer.

The one area where AI assistance was least effective was in debugging failures caused by test infrastructure coupling. When AUTH-03 tests produced unexpected results after the rate limiter was added to the server, diagnosing the interaction (each Jest test FILE gets a fresh module instance, but requests within a file share the same rate-limit store) required understanding Jest's module isolation semantics, which is not captured in any single source file. This required manual reasoning rather than AI assistance.

### Improvements and Changes

Three improvements would strengthen the AI-driven security testing workflow for a future sprint:

**1. Threat model as a formal input.** The current workflow gave Claude the OWASP category and the controller code. A more effective input would be a structured threat model (entry points, trust boundaries, assets) generated first, then used to scope each story. This would reduce the risk of over-testing obvious paths while under-testing non-obvious ones (e.g. the `forgotPasswordController` NoSQL injection was caught because it was explicitly included in the INJ story; it might have been missed with a less structured threat model).

**2. Regression test generation on bug fix commits.** When the four vulnerabilities were fixed, no regression tests were automatically generated for the fixes. In the MS2 workflow, fixing BUG-01 and BUG-02 was accompanied by integration tests that would catch a regression. For security fixes, the same discipline should apply: each fix commit should be accompanied by a test that would have caught the original vulnerability. Claude could generate these regression tests automatically given the diff and the finding description.

**3. Coverage-guided story selection.** The current story selection was based on the OWASP Top 10 and subjective risk assessment. A more rigorous approach would map each story to the specific lines of production code it exercises, then identify code paths with no security test coverage. This is analogous to code coverage for unit tests, applied to security properties.

---
*Low Wei Sheng, A0259272X*
