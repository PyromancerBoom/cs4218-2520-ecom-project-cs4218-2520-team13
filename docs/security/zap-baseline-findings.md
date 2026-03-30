# OWASP ZAP Baseline Scan — Findings

**Date:** 2026-03-28
**Target:** http://localhost:6060 (run via `node server.js`)
**Image:** ghcr.io/zaproxy/zaproxy:stable
**Command:** `zap-baseline.py -t http://host.docker.internal:6060`

## Summary

| Level | Count |
|-------|-------|
| FAIL  | 0     |
| WARN  | 8     |
| PASS  | 59    |

## WARN-NEW Alerts

| ID | Alert | Matches supertest finding? | Disposition |
|----|-------|---------------------------|-------------|
| 10021 | X-Content-Type-Options Header Missing | ✅ CONFIG-02 (`config.headers.security.test.js`) | Real finding — no helmet |
| 10037 | Server Leaks Information via "X-Powered-By" HTTP Response Header | ✅ CONFIG-02 | Real finding — X-Powered-By exposes Express |
| 10038 | Content Security Policy (CSP) Header Not Set | ⚠️ Additional (not in supertest suite) | Real finding — helmet would add CSP |
| 10049 | Storable and Cacheable Content | No | Low severity — no cache-control headers on static responses |
| 10055 | CSP: Failure to Define Directive with No Fallback | No | False positive — CSP not set at all |
| 10063 | Permissions Policy Header Not Set | No | Informational — not covered by helmet by default |
| 10098 | Cross-Domain Misconfiguration (CORS wildcard) | ✅ CONFIG-01 (`config.cors.security.test.js`) | Real finding — `cors()` with no options → `Access-Control-Allow-Origin: *` |
| 90004 | Cross-Origin-Embedder-Policy Header Missing or Invalid | No | Additional hardening — not blocking |

## Notes

- ZAP only spidered the root URL (not authenticated API routes) since there's no API key or login flow in the baseline scan.
- The three core findings (X-Content-Type-Options, X-Powered-By, CORS wildcard) align exactly with the supertest findings from CONFIG-01 and CONFIG-02.
- Remediation: `npm install helmet` + `app.use(helmet())` addresses findings 10021, 10037, and partially 10038/10063/90004. CORS fix addresses 10098.
