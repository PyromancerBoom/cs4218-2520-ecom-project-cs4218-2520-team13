// tests/security/config.cors.security.test.js
import request from 'supertest';
import app from '../../server.js';
import { startMemoryDB, stopMemoryDB } from '../helpers/db.js';

beforeAll(() => startMemoryDB());
afterAll(() => stopMemoryDB());

describe('CONFIG-01: CORS Policy', () => {
  /**
   * SECURITY FINDING (expected to fail):
   * server.js uses cors() with no options.
   * Default behaviour: Access-Control-Allow-Origin: * on all responses.
   * Fix:
   *   app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:3000' }));
   */

  test('untrusted origin does not receive wildcard ACAO header', async () => {
    const res = await request(app)
      .get('/api/v1/auth/user-auth')
      .set('Origin', 'http://evil.com');

    const acao = res.headers['access-control-allow-origin'];
    // Should NOT be * or http://evil.com
    expect(acao).not.toBe('*');
    expect(acao).not.toBe('http://evil.com');
  });

  test('wildcard ACAO is not set on any API response', async () => {
    const res = await request(app).get('/');
    const acao = res.headers['access-control-allow-origin'];
    expect(acao).not.toBe('*');
  });

  test('trusted origin (localhost:3000) receives ACAO header', async () => {
    const res = await request(app)
      .get('/api/v1/auth/user-auth')
      .set('Origin', 'http://localhost:3000');

    const acao = res.headers['access-control-allow-origin'];
    expect(acao).toBe('http://localhost:3000');
  });
});
