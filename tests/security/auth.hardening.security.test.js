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
  test('missing email returns non-2xx', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ password: 'password123' });
    expect(res.status).not.toBe(200);
  });

  test('missing password returns non-2xx', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'user@test.com' });
    expect(res.status).not.toBe(200);
  });
});

describe('AUTH-03b: Input validation on forgot-password', () => {
  test('missing email returns non-2xx', async () => {
    const res = await request(app)
      .post('/api/v1/auth/forgot-password')
      .send({ answer: 'blue', newPassword: 'new' });
    expect(res.status).not.toBe(200);
  });

  test('missing answer returns non-2xx', async () => {
    const res = await request(app)
      .post('/api/v1/auth/forgot-password')
      .send({ email: 'x@x.com', newPassword: 'new' });
    expect(res.status).not.toBe(200);
  });

  test('missing newPassword returns non-2xx', async () => {
    const res = await request(app)
      .post('/api/v1/auth/forgot-password')
      .send({ email: 'x@x.com', answer: 'blue' });
    expect(res.status).not.toBe(200);
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
  test.each(forgotPasswordInjectionPayloads.map((p, i) => [i, p]))(
    'forgot-password injection payload #%i does not reset the seeded user password',
    async (_, payload) => {
      // Attempt the injection
      await request(app).post('/api/v1/auth/forgot-password').send(payload);

      // Verify the seeded user can still log in with original password
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: seededEmail, password: seededPlainPassword });
      expect(loginRes.status).toBe(200);
      expect(loginRes.body.token).toBeDefined();
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
