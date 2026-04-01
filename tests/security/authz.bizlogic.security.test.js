// tests/security/authz.bizlogic.security.test.js
import request from 'supertest';
import app from '../../server.js';
import mongoose from 'mongoose';
import {
  startMemoryDB,
  stopMemoryDB,
  createUser,
  createAdmin,
  createOrder,
  generateToken,
} from '../helpers/db.js';

let userToken;
let adminToken;
let orderId;

beforeAll(async () => {
  await startMemoryDB();
  const { user } = await createUser();
  const { user: admin } = await createAdmin();
  userToken = generateToken(user._id);
  adminToken = generateToken(admin._id);

  const order = await createOrder({ buyer: user._id });
  orderId = order._id.toString();
});

afterAll(() => stopMemoryDB());

describe('AUTHZ-04: Business Logic — Order Status Mutation', () => {
  test('regular user cannot mutate order status', async () => {
    const res = await request(app)
      .put(`/api/v1/auth/order-status/${orderId}`)
      .set('Authorization', userToken)
      .send({ status: 'Shipped' });
    expect(res.status).toBe(401);
  });

  test('admin can set a valid status value', async () => {
    const res = await request(app)
      .put(`/api/v1/auth/order-status/${orderId}`)
      .set('Authorization', adminToken)
      .send({ status: 'Processing' });
    expect(res.status).toBe(200);
  });

  test('admin sending an invalid enum value is rejected (regression BUG-02)', async () => {
    const res = await request(app)
      .put(`/api/v1/auth/order-status/${orderId}`)
      .set('Authorization', adminToken)
      .send({ status: 'INVALID_STATUS_XYZ' });
    // Mongoose runValidators:true validation error returns 500 from error handler
    expect(res.status).toBe(500);
  });

  test('admin sending a non-existent orderId returns 404 (regression BUG-03)', async () => {
    const nonExistentId = new mongoose.Types.ObjectId().toString();
    const res = await request(app)
      .put(`/api/v1/auth/order-status/${nonExistentId}`)
      .set('Authorization', adminToken)
      .send({ status: 'Shipped' });
    expect(res.status).toBe(404);
  });

  test('admin sending a malformed orderId returns 400 (regression BUG-04)', async () => {
    const res = await request(app)
      .put('/api/v1/auth/order-status/not-a-valid-id')
      .set('Authorization', adminToken)
      .send({ status: 'Shipped' });
    expect(res.status).toBe(400);
  });
});
