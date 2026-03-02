// tests/integration/auth.orders.admin.test.js
// Wei Sheng, A0259272X
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../server.js';
import {
  startMemoryDB, stopMemoryDB, clearCollections,
  createAdmin, createUser, createProduct, createOrder, generateToken,
} from '../helpers/db.js';

describe('PUT /api/v1/auth/order-status/:orderId', () => {
  beforeAll(startMemoryDB);
  afterAll(stopMemoryDB);
  afterEach(clearCollections);

  it('BUG-02: rejects invalid status value with non-200 response', async () => {
    const { user: admin } = await createAdmin();
    const { user: buyer } = await createUser();
    const product = await createProduct();
    const order = await createOrder({ buyer: buyer._id, products: [product._id] });
    const token = generateToken(admin._id);

    const res = await request(app)
      .put(`/api/v1/auth/order-status/${order._id}`)
      .set('Authorization', token)
      .send({ status: 'INVALID_STATUS' });

    expect(res.status).not.toBe(200);
  });

  it('BUG-03: returns 404 when orderId does not exist', async () => {
    const { user: admin } = await createAdmin();
    const token = generateToken(admin._id);
    const missingId = new mongoose.Types.ObjectId().toString();

    const res = await request(app)
      .put(`/api/v1/auth/order-status/${missingId}`)
      .set('Authorization', token)
      .send({ status: 'Processing' });

    expect(res.status).toBe(404);
  });

  it('BUG-04: returns 400 for malformed orderId format', async () => {
    const { user: admin } = await createAdmin();
    const token = generateToken(admin._id);

    const res = await request(app)
      .put('/api/v1/auth/order-status/not-a-valid-objectid')
      .set('Authorization', token)
      .send({ status: 'Processing' });

    expect(res.status).toBe(400);
  });
});
