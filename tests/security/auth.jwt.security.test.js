// tests/security/auth.jwt.security.test.js
import JWT from 'jsonwebtoken';
import request from 'supertest';
import app from '../../server.js';
import {
  startMemoryDB,
  stopMemoryDB,
  createUser,
  createAdmin,
  generateToken,
} from '../helpers/db.js';

const makeExpiredToken = (userId) =>
  JWT.sign({ _id: userId }, process.env.JWT_SECRET || 'test-jwt-secret-for-integration-tests', { expiresIn: 0 });

const toBase64url = (obj) =>
  Buffer.from(JSON.stringify(obj)).toString('base64url');

// Declare variables at file scope so both describe blocks can access them
let userId, adminId, validToken;

beforeAll(async () => {
  await startMemoryDB();
  const { user } = await createUser();
  const { user: admin } = await createAdmin();
  userId = user._id;
  adminId = admin._id;
  validToken = generateToken(user._id);
});

afterAll(() => stopMemoryDB());

describe('AUTH-01: JWT Expiry Enforcement', () => {

  test('[expired] GET /api/v1/auth/user-auth returns 401', async () => {
    const res = await request(app)
      .get('/api/v1/auth/user-auth')
      .set('Authorization', makeExpiredToken(userId));
    expect(res.status).toBe(401);
  });

  test('[expired] GET /api/v1/auth/admin-auth returns 401', async () => {
    const res = await request(app)
      .get('/api/v1/auth/admin-auth')
      .set('Authorization', makeExpiredToken(adminId));
    expect(res.status).toBe(401);
  });

  test('[expired] PUT /api/v1/auth/profile returns 401', async () => {
    const res = await request(app)
      .put('/api/v1/auth/profile')
      .set('Authorization', makeExpiredToken(userId))
      .send({ name: 'Test', phone: '12345678', address: 'Test Street' });
    expect(res.status).toBe(401);
  });

  test('[valid] GET /api/v1/auth/user-auth returns 200 with non-expired token', async () => {
    const res = await request(app)
      .get('/api/v1/auth/user-auth')
      .set('Authorization', generateToken(userId));
    expect(res.status).toBe(200);
  });
});

describe('AUTH-02: JWT Signature & Algorithm Validation', () => {

  test('[none-algorithm] token with alg:none returns 401', async () => {
    // Reconstruct header with alg:none, keep original payload, empty signature
    const [, payloadB64] = validToken.split('.');
    const noneHeader = toBase64url({ alg: 'none', typ: 'JWT' });
    const noneToken = `${noneHeader}.${payloadB64}.`;

    const res = await request(app)
      .get('/api/v1/auth/user-auth')
      .set('Authorization', noneToken);
    expect(res.status).toBe(401);
  });

  test('[tampered-payload] modified _id in payload returns 401', async () => {
    const [headerB64, , sigB64] = validToken.split('.');
    // Replace payload with a different _id
    const tamperedPayload = toBase64url({ _id: '000000000000000000000000' });
    const tamperedToken = `${headerB64}.${tamperedPayload}.${sigB64}`;

    const res = await request(app)
      .get('/api/v1/auth/user-auth')
      .set('Authorization', tamperedToken);
    expect(res.status).toBe(401);
  });

  test('[tampered-signature] one character changed in signature returns 401', async () => {
    const parts = validToken.split('.');
    const sig = parts[2];
    // Flip a middle character to avoid padding bits
    const mid = Math.floor(sig.length / 2);
    const flipped = sig.slice(0, mid) + (sig[mid] === 'A' ? 'B' : 'A') + sig.slice(mid + 1);
    const tamperedToken = `${parts[0]}.${parts[1]}.${flipped}`;

    const res = await request(app)
      .get('/api/v1/auth/user-auth')
      .set('Authorization', tamperedToken);
    expect(res.status).toBe(401);
  });

  test('[no-token] request without Authorization header returns 401', async () => {
    const res = await request(app).get('/api/v1/auth/user-auth');
    expect(res.status).toBe(401);
  });
});
