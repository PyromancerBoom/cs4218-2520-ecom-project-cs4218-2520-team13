import request from 'supertest';
import app from '../../server.js';
import { startMemoryDB, stopMemoryDB, createUser } from '../helpers/db.js';

const THRESHOLD = 20;

beforeAll(async () => {
  await startMemoryDB();
  await createUser({ email: 'ratelimit-target@test.com' });
});

afterAll(() => stopMemoryDB());

describe('AUTH-04: Brute Force & Rate Limiting', () => {
  test(`${THRESHOLD} concurrent failed login attempts trigger HTTP 429`, async () => {
    const requests = Array.from({ length: THRESHOLD }, () =>
      request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'ratelimit-target@test.com', password: 'wrong_password' })
    );

    const responses = await Promise.all(requests);
    const throttled = responses.filter((r) => r.status === 429);

    if (throttled.length === 0) {
      /*
       * SECURITY FINDING — AUTH-04
       * OWASP: A07 Identification and Authentication Failures
       * CWE: CWE-307 Improper Restriction of Excessive Authentication Attempts
       * CVSS 3.1: 5.3 (Medium) — CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:N/A:N
       *
       * No rate limiting is enforced on POST /api/v1/auth/login.
       * An attacker can attempt unlimited passwords against any known email.
       *
       * Remediation:
       *   npm install express-rate-limit
       *
       *   // In server.js, before app.use("/api/v1/auth", authRoutes):
       *   import rateLimit from 'express-rate-limit';
       *   const loginLimiter = rateLimit({
       *     windowMs: 15 * 60 * 1000,  // 15 minutes
       *     max: 10,                    // 10 attempts per window
       *     message: { success: false, message: 'Too many login attempts, try again later.' },
       *   });
       *   app.use('/api/v1/auth/login', loginLimiter);
       */
    }

    expect(throttled.length).toBeGreaterThan(0);
  });
});
