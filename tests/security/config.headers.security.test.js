// tests/security/config.headers.security.test.js
import request from 'supertest';
import app from '../../server.js';
import { startMemoryDB, stopMemoryDB } from '../helpers/db.js';

beforeAll(() => startMemoryDB());
afterAll(() => stopMemoryDB());

describe('CONFIG-02: Security Headers', () => {
  /**
   * SECURITY FINDING (expected to fail):
   * server.js does not set security headers.
   * Fix: npm install helmet && app.use(helmet()) in server.js
   *   import helmet from 'helmet';
   *   app.use(helmet());
   * This adds: X-Content-Type-Options, X-Frame-Options, removes X-Powered-By, and more.
   */

  let headers;

  beforeAll(async () => {
    const res = await request(app).get('/');
    headers = res.headers;
  });

  test('X-Content-Type-Options: nosniff is set', () => {
    expect(headers['x-content-type-options']).toBe('nosniff');
  });

  test('X-Frame-Options is set', () => {
    const xfo = headers['x-frame-options'];
    expect(['DENY', 'SAMEORIGIN']).toContain(xfo?.toUpperCase());
  });

  test('X-Powered-By header is absent (server fingerprinting removed)', () => {
    expect(headers['x-powered-by']).toBeUndefined();
  });
});
