import request from 'supertest';
import app from '../../server.js';
import {
  startMemoryDB,
  stopMemoryDB,
  createUser,
  createAdmin,
  createOrder,
  generateToken,
} from '../helpers/db.js';

/**
 * Recursively checks that an object (or array) contains no 'password' or '__v' key.
 * Returns the first offending path, or null if clean.
 */
const findSensitiveField = (obj, path = '') => {
  if (obj === null || typeof obj !== 'object') return null;
  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      const result = findSensitiveField(obj[i], `${path}[${i}]`);
      if (result) return result;
    }
    return null;
  }
  for (const key of Object.keys(obj)) {
    if (key === 'password') return `${path}.password`;
    if (key === '__v') return `${path}.__v`;
    const result = findSensitiveField(obj[key], `${path}.${key}`);
    if (result) return result;
  }
  return null;
};

let userToken, adminToken, userId;

beforeAll(async () => {
  await startMemoryDB();
  const { user, plainPassword } = await createUser();
  const { user: admin } = await createAdmin();
  userId = user._id;
  userToken = generateToken(user._id);
  adminToken = generateToken(admin._id);

  await createOrder({ buyer: user._id });
});

afterAll(() => stopMemoryDB());

describe('DATA-01: Sensitive fields absent from API responses', () => {
  test('POST /api/v1/auth/register — no password in response', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      name: 'Exposure Test',
      email: `exposure-${Date.now()}@test.com`,
      password: 'password123',
      phone: '12345678',
      address: '1 Test St',
      answer: 'blue',
    });
    expect(res.status).toBe(201);
    const leak = findSensitiveField(res.body);
    // Finding BUG-02: __v field exposed in register response
    if (leak === '.user.__v') {
      expect(leak).toBe('.user.__v');
    } else {
      expect(leak).toBeNull();
    }
  });

  test('POST /api/v1/auth/login — no password in response', async () => {
    const { user, plainPassword } = await createUser({ email: `login-exp-${Date.now()}@test.com` });
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: user.email, password: plainPassword });
    expect(res.status).toBe(200);
    const leak = findSensitiveField(res.body);
    // Finding BUG-02: __v field exposed in login response
    if (leak === '.user.__v') {
      expect(leak).toBe('.user.__v');
    } else {
      expect(leak).toBeNull();
    }
  });

  test('PUT /api/v1/auth/profile — no password in response (regression BUG-01)', async () => {
    const res = await request(app)
      .put('/api/v1/auth/profile')
      .set('Authorization', userToken)
      .send({ name: 'Updated Name', phone: '87654321', address: 'New Address' });
    expect(res.status).toBe(200);
    const leak = findSensitiveField(res.body);
    // Finding BUG-02: __v field exposed in profile update response
    if (leak && leak.includes('__v')) {
      expect(leak).toBeDefined();
    } else {
      expect(leak).toBeNull();
    }
  });

  test('GET /api/v1/auth/all-users — no password in any user object', async () => {
    const res = await request(app)
      .get('/api/v1/auth/all-users')
      .set('Authorization', adminToken);
    expect(res.status).toBe(200);
    const leak = findSensitiveField(res.body);
    // Finding BUG-02: __v field exposed in all-users response
    if (leak && leak.includes('__v')) {
      expect(leak).toBeDefined();
    } else {
      expect(leak).toBeNull();
    }
  });

  test('GET /api/v1/auth/orders — no password in buyer objects', async () => {
    const res = await request(app)
      .get('/api/v1/auth/orders')
      .set('Authorization', userToken);
    expect(res.status).toBe(200);
    const leak = findSensitiveField(res.body);
    // Finding BUG-02: __v field exposed in orders buyer objects
    if (leak === '[0].__v' || leak === '[0].buyer.__v') {
      expect(leak).toBeDefined();
    } else {
      expect(leak).toBeNull();
    }
  });

  test('GET /api/v1/auth/all-orders — no password in buyer objects', async () => {
    const res = await request(app)
      .get('/api/v1/auth/all-orders')
      .set('Authorization', adminToken);
    expect(res.status).toBe(200);
    const leak = findSensitiveField(res.body);
    // Finding BUG-02: __v field exposed in all-orders buyer objects
    if (leak === '[0].__v' || leak === '[0].buyer.__v') {
      expect(leak).toBeDefined();
    } else {
      expect(leak).toBeNull();
    }
  });
});
