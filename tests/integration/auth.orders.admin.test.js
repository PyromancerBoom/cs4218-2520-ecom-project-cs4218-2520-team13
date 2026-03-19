// Integration tests for GET /api/v1/auth/all-orders and PUT /api/v1/auth/order-status/:orderId
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../server.js';
import {
  startMemoryDB, stopMemoryDB, clearCollections,
  createAdmin, createUser, createProduct, createOrder, generateToken,
} from '../helpers/db.js';

// ─── GET /api/v1/auth/all-orders ──────────────────────────────────────────────
// LOW WEI SHENG, A0259272X
describe('GET /api/v1/auth/all-orders', () => {
  beforeAll(startMemoryDB);
  afterAll(stopMemoryDB);
  afterEach(clearCollections);

  // LOW WEI SHENG, A0259272X
  it('returns 200 with all orders when requested by admin', async () => {
    const { user: admin } = await createAdmin();
    const { user: buyer1 } = await createUser();
    const { user: buyer2 } = await createUser();
    const product = await createProduct();
    await createOrder({ buyer: buyer1._id, products: [product._id] });
    await createOrder({ buyer: buyer1._id, products: [product._id] });
    await createOrder({ buyer: buyer2._id, products: [product._id] });
    const token = generateToken(admin._id);

    const res = await request(app)
      .get('/api/v1/auth/all-orders')
      .set('Authorization', token);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(3);
  });

  // LOW WEI SHENG, A0259272X
  it('returns orders sorted by createdAt descending', async () => {
    const { user: admin } = await createAdmin();
    const { user: buyer } = await createUser();
    const product = await createProduct();
    const oldest = await createOrder({ buyer: buyer._id, products: [product._id] });
    await new Promise(r => setTimeout(r, 20)); // ensure distinct timestamps
    const newest = await createOrder({ buyer: buyer._id, products: [product._id] });
    const token = generateToken(admin._id);

    const res = await request(app)
      .get('/api/v1/auth/all-orders')
      .set('Authorization', token);

    expect(res.status).toBe(200);
    expect(res.body[0]._id).toBe(newest._id.toString()); // newest first
    expect(res.body[1]._id).toBe(oldest._id.toString());
  });

  // LOW WEI SHENG, A0259272X
  it('populates products without photo and buyer with name only', async () => {
    const { user: admin } = await createAdmin();
    const { user: buyer } = await createUser();
    const product = await createProduct();
    await createOrder({ buyer: buyer._id, products: [product._id] });
    const token = generateToken(admin._id);

    const res = await request(app)
      .get('/api/v1/auth/all-orders')
      .set('Authorization', token);

    expect(res.status).toBe(200);
    expect(res.body[0].products[0].photo).toBeUndefined();
    expect(res.body[0].buyer.name).toBeDefined();
  });

  // LOW WEI SHENG, A0259272X
  it('does not expose buyer password in any returned order', async () => {
    const { user: admin } = await createAdmin();
    const { user: buyer } = await createUser();
    const product = await createProduct();
    await createOrder({ buyer: buyer._id, products: [product._id] });
    const token = generateToken(admin._id);

    const res = await request(app)
      .get('/api/v1/auth/all-orders')
      .set('Authorization', token);

    expect(res.status).toBe(200);
    for (const order of res.body) {
      expect(order.buyer.password).toBeUndefined();
    }
  });

  // LOW WEI SHENG, A0259272X
  it('returns 200 with empty array when no orders exist', async () => {
    const { user: admin } = await createAdmin();
    const token = generateToken(admin._id);

    const res = await request(app)
      .get('/api/v1/auth/all-orders')
      .set('Authorization', token);

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  // LOW WEI SHENG, A0259272X
  it('returns 401 for non-admin user', async () => {
    const { user } = await createUser();
    const token = generateToken(user._id);

    const res = await request(app)
      .get('/api/v1/auth/all-orders')
      .set('Authorization', token);

    expect(res.status).toBe(401);
  });

  // LOW WEI SHENG, A0259272X
  it('returns 401 when unauthenticated', async () => {
    const res = await request(app).get('/api/v1/auth/all-orders');
    expect(res.status).toBe(401);
  });
});

// ─── PUT /api/v1/auth/order-status/:orderId ───────────────────────────────────
// LOW WEI SHENG, A0259272X
describe('PUT /api/v1/auth/order-status/:orderId', () => {
  beforeAll(startMemoryDB);
  afterAll(stopMemoryDB);
  afterEach(clearCollections);

  // LOW WEI SHENG, A0259272X
  it('updates order status and returns updated order', async () => {
    const { user: admin } = await createAdmin();
    const { user: buyer } = await createUser();
    const product = await createProduct();
    const order = await createOrder({ buyer: buyer._id, products: [product._id] });
    const token = generateToken(admin._id);

    const res = await request(app)
      .put(`/api/v1/auth/order-status/${order._id}`)
      .set('Authorization', token)
      .send({ status: 'Processing' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('Processing');
  });

  // LOW WEI SHENG, A0259272X
  it('accepts all five valid enum status values', async () => {
    const { user: admin } = await createAdmin();
    const { user: buyer } = await createUser();
    const product = await createProduct();
    const token = generateToken(admin._id);
    const validStatuses = ['Not Processed', 'Processing', 'Shipped', 'Delivered', 'Cancel'];

    for (const status of validStatuses) {
      const order = await createOrder({ buyer: buyer._id, products: [product._id] });
      const res = await request(app)
        .put(`/api/v1/auth/order-status/${order._id}`)
        .set('Authorization', token)
        .send({ status });
      expect(res.status).toBe(200);
      expect(res.body.status).toBe(status);
    }
  });

  // LOW WEI SHENG, A0259272X
  it('BUG-02 (fixed): rejects invalid status value with non-200 response', async () => {
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

  // LOW WEI SHENG, A0259272X
  it('BUG-03 (fixed): returns 404 when orderId does not exist in DB', async () => {
    const { user: admin } = await createAdmin();
    const token = generateToken(admin._id);
    const missingId = new mongoose.Types.ObjectId().toString();

    const res = await request(app)
      .put(`/api/v1/auth/order-status/${missingId}`)
      .set('Authorization', token)
      .send({ status: 'Processing' });

    expect(res.status).toBe(404);
  });

  // LOW WEI SHENG, A0259272X
  it('BUG-04 (fixed): returns 400 for malformed orderId format', async () => {
    const { user: admin } = await createAdmin();
    const token = generateToken(admin._id);

    const res = await request(app)
      .put('/api/v1/auth/order-status/not-a-valid-objectid')
      .set('Authorization', token)
      .send({ status: 'Processing' });

    expect(res.status).toBe(400);
  });

  // LOW WEI SHENG, A0259272X
  it('returns 401 for non-admin user', async () => {
    const { user } = await createUser();
    const { user: buyer } = await createUser();
    const order = await createOrder({ buyer: buyer._id });
    const token = generateToken(user._id);

    const res = await request(app)
      .put(`/api/v1/auth/order-status/${order._id}`)
      .set('Authorization', token)
      .send({ status: 'Processing' });

    expect(res.status).toBe(401);
  });

  // LOW WEI SHENG, A0259272X
  it('returns 401 when unauthenticated', async () => {
    const order = await createOrder({});

    const res = await request(app)
      .put(`/api/v1/auth/order-status/${order._id}`)
      .send({ status: 'Processing' });

    expect(res.status).toBe(401);
  });
});
