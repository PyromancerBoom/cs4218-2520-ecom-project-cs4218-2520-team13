// LOW WEI SHENG, A0259272X
// tests/integration/auth.orders.user.test.js
// LOW WEI SHENG, A0259272X
// Integration tests for GET /api/v1/auth/orders (user order retrieval)
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../server.js';
import userModel from '../../models/userModel.js';
import {
  startMemoryDB, stopMemoryDB, clearCollections,
  createUser, createProduct, createOrder, generateToken,
} from '../helpers/db.js';

describe('GET /api/v1/auth/orders', () => {
  beforeAll(startMemoryDB);
  afterAll(stopMemoryDB);
  afterEach(clearCollections);

  it('returns 200 with array of orders for authenticated user', async () => {
    const { user } = await createUser();
    const product = await createProduct();
    await createOrder({ buyer: user._id, products: [product._id] });
    await createOrder({ buyer: user._id, products: [product._id] });
    const token = generateToken(user._id);

    const res = await request(app)
      .get('/api/v1/auth/orders')
      .set('Authorization', token);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });

  it('populates products without photo field', async () => {
    const { user } = await createUser();
    const product = await createProduct();
    await createOrder({ buyer: user._id, products: [product._id] });
    const token = generateToken(user._id);

    const res = await request(app)
      .get('/api/v1/auth/orders')
      .set('Authorization', token);

    expect(res.status).toBe(200);
    const p = res.body[0].products[0];
    expect(p.name).toBeDefined();
    expect(p.price).toBeDefined();
    expect(p.photo).toBeUndefined(); // security: photo excluded via "-photo" projection
  });

  it('populates buyer with name only — no email or password', async () => {
    const { user } = await createUser();
    const product = await createProduct();
    await createOrder({ buyer: user._id, products: [product._id] });
    const token = generateToken(user._id);

    const res = await request(app)
      .get('/api/v1/auth/orders')
      .set('Authorization', token);

    expect(res.status).toBe(200);
    const buyer = res.body[0].buyer;
    expect(buyer.name).toBeDefined();
    expect(buyer.email).toBeUndefined(); // security regression guard
    expect(buyer.password).toBeUndefined(); // security regression guard
  });

  it('returns only the requesting user\'s own orders (multi-user isolation)', async () => {
    const { user: userA } = await createUser();
    const { user: userB } = await createUser();
    const product = await createProduct();
    // userA has 2 orders; userB has 2 orders
    await createOrder({ buyer: userA._id, products: [product._id] });
    await createOrder({ buyer: userA._id, products: [product._id] });
    await createOrder({ buyer: userB._id, products: [product._id] });
    await createOrder({ buyer: userB._id, products: [product._id] });
    const token = generateToken(userA._id);

    const res = await request(app)
      .get('/api/v1/auth/orders')
      .set('Authorization', token);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0].buyer._id.toString()).toBe(userA._id.toString());
  });

  it('returns 200 with empty array when user has no orders', async () => {
    const { user } = await createUser();
    const token = generateToken(user._id);

    const res = await request(app)
      .get('/api/v1/auth/orders')
      .set('Authorization', token);

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('returns 401 when no Authorization header is provided', async () => {
    const res = await request(app).get('/api/v1/auth/orders');
    expect(res.status).toBe(401);
  });

  it('returns 401 for an invalid token string', async () => {
    const res = await request(app)
      .get('/api/v1/auth/orders')
      .set('Authorization', 'this-is-not-a-valid-jwt');

    expect(res.status).toBe(401);
  });

  it('returns 401 for a token signed with a wrong secret', async () => {
    // JWT signed with different secret — middleware should reject it
    const badToken = 'eyJhbGciOiJIUzI1NiJ9.eyJfaWQiOiI2NjYifQ.wrongsignature';
    const res = await request(app)
      .get('/api/v1/auth/orders')
      .set('Authorization', badToken);

    expect(res.status).toBe(401);
  });

  it('ghost access: valid JWT for a deleted user returns 200 with empty array', async () => {
    // KNOWN GAP: requireSignIn does not check DB existence — trusts token signature.
    // A deleted user's token still passes middleware and returns empty orders.
    // This test documents the current behaviour. Fix would require a DB existence
    // check in requireSignIn or a token blacklist.
    const { user } = await createUser();
    const token = generateToken(user._id);
    await userModel.findByIdAndDelete(user._id); // delete user from DB

    const res = await request(app)
      .get('/api/v1/auth/orders')
      .set('Authorization', token);

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('sort order: documents that getOrdersController has no sort guarantee', async () => {
    // NOTE: getOrdersController uses find() without .sort().
    // Order is insertion order (MongoDB default), which is NOT guaranteed to match
    // createdAt descending. This is INCONSISTENT with getAllOrdersController which
    // does sort by createdAt desc. Flag for future fix.
    const { user } = await createUser();
    const product = await createProduct();
    const first = await createOrder({ buyer: user._id, products: [product._id] });
    const second = await createOrder({ buyer: user._id, products: [product._id] });
    const token = generateToken(user._id);

    const res = await request(app)
      .get('/api/v1/auth/orders')
      .set('Authorization', token);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    // Document actual (insertion) order — not asserting descending because no sort is applied.
    // IDs should be present regardless of order.
    const ids = res.body.map(o => o._id);
    expect(ids).toContain(first._id.toString());
    expect(ids).toContain(second._id.toString());
  });
});
