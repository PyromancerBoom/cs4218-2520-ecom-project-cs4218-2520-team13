// tests/security/authz.massassign.security.test.js
import request from 'supertest';
import app from '../../server.js';
import { startMemoryDB, stopMemoryDB, generateToken } from '../helpers/db.js';
import userModel from '../../models/userModel.js';

beforeAll(() => startMemoryDB());
afterAll(() => stopMemoryDB());

describe('AUTHZ-03: Mass Assignment — Role Field Ignored on Registration', () => {
  test('registering with role:1 does not create an admin account', async () => {
    const regRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Mass Assignment Test',
        email: `massassign-${Date.now()}@test.com`,
        password: 'password123',
        phone: '12345678',
        address: '1 Test St',
        answer: 'blue',
        role: 1,  // attempt to self-promote to admin
      });

    expect(regRes.status).toBe(201);
    const userId = regRes.body.user._id;

    // Check role in DB directly
    const dbUser = await userModel.findById(userId);
    expect(dbUser.role).toBe(0);
  });

  test('self-promoted user is rejected by admin-auth endpoint', async () => {
    const regRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Mass Assignment Test 2',
        email: `massassign2-${Date.now()}@test.com`,
        password: 'password123',
        phone: '12345678',
        address: '1 Test St',
        answer: 'blue',
        role: 1,
      });

    const userId = regRes.body.user._id;
    const token = generateToken(userId);

    const authRes = await request(app)
      .get('/api/v1/auth/admin-auth')
      .set('Authorization', token);

    expect(authRes.status).toBe(401);
  });
});
