// tests/security/auth.hardening.security.test.js
import request from 'supertest';
import app from '../../server.js';
import { startMemoryDB, stopMemoryDB, createUser } from '../helpers/db.js';
import { loginInjectionPayloads, forgotPasswordInjectionPayloads } from './helpers/payloads.js';

let seededEmail;
let seededPlainPassword;

beforeAll(async () => {
  await startMemoryDB();
  const { user, plainPassword } = await createUser({ email: 'target-user@test.com', answer: 'blue' });
  seededEmail = user.email;
  seededPlainPassword = plainPassword;
});

afterAll(() => stopMemoryDB());

describe('AUTH-03a: Input validation on login', () => {
  test('missing email returns 404', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ password: 'password123' });
    expect(res.status).toBe(404);
  });

  test('missing password returns 404', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'user@test.com' });
    expect(res.status).toBe(404);
  });
});

describe('AUTH-03b: Input validation on forgot-password', () => {
  test('missing email returns 400', async () => {
    const res = await request(app)
      .post('/api/v1/auth/forgot-password')
      .send({ answer: 'blue', newPassword: 'new' });
    expect(res.status).toBe(400);
  });

  test('missing answer returns 400', async () => {
    const res = await request(app)
      .post('/api/v1/auth/forgot-password')
      .send({ email: 'x@x.com', newPassword: 'new' });
    expect(res.status).toBe(400);
  });

  test('missing newPassword returns 400', async () => {
    const res = await request(app)
      .post('/api/v1/auth/forgot-password')
      .send({ email: 'x@x.com', answer: 'blue' });
    expect(res.status).toBe(400);
  });
});

describe('AUTH-03c: NoSQL injection resistance on login', () => {
  test.each(loginInjectionPayloads.map((p, i) => [i, p]))(
    'injection payload #%i does not return HTTP 200 or a token',
    async (_, payload) => {
      const res = await request(app).post('/api/v1/auth/login').send(payload);
      expect(res.status).not.toBe(200);
      expect(res.body.token).toBeUndefined();
    }
  );
});

describe('AUTH-03d: NoSQL injection resistance on forgot-password', () => {
  /**
   * SECURITY FINDING (expected to fail — 3 tests):
   * forgotPasswordController calls userModel.findOne({ email, answer }) without sanitizing
   * operator objects from req.body. When email/answer are MongoDB operators like { $ne: null },
   * findOne matches the first user in the collection and resets their password.
   * The server returns HTTP 200 for these injection payloads — it should return 400.
   *
   * OWASP: A03:2021 Injection · CWE-943 Improper Neutralization of Special Elements in Data Query
   * Fix: Use express-mongo-sanitize to strip $ operators from req.body before controller runs.
   *   npm install express-mongo-sanitize
   *   import mongoSanitize from 'express-mongo-sanitize';
   *   app.use(mongoSanitize());  // in server.js, before routes
   */
  test.each(forgotPasswordInjectionPayloads.map((p, i) => [i, p]))(
    'forgot-password injection payload #%i is rejected by the server (not 200)',
    async (_, payload) => {
      const injRes = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send(payload);
      // If the server accepts a MongoDB operator object as a field value and returns 200,
      // it processed the injection — this is the finding.
      expect(injRes.status).not.toBe(200);
    }
  );
});

describe('AUTH-03e: Error message consistency (email enumeration prevention)', () => {
  /**
   * SECURITY FINDING (expected to fail):
   * loginController returns "Email is not registered" (404) for unknown emails
   * and "Invalid Password" (401) for wrong passwords.
   * These are different messages — an attacker can enumerate valid accounts.
   *
   * Fix: return the same message and status for both cases, e.g.:
   *   return res.status(401).send({ success: false, message: "Invalid email or password" });
   */
  test('valid email + wrong password returns same status as invalid email + wrong password', async () => {
    const knownEmailWrongPw = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: seededEmail, password: 'wrong_password_xyz' });

    const unknownEmail = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'nonexistent@test.com', password: 'wrong_password_xyz' });

    // Both should return the same HTTP status (email enumeration prevention)
    expect(knownEmailWrongPw.status).toBe(unknownEmail.status);
    // Both should return the same response message
    expect(knownEmailWrongPw.body.message).toBe(unknownEmail.body.message);
  });
});
