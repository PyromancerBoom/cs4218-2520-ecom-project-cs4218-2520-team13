import request from 'supertest';
import app from '../../server.js';
import {
  startMemoryDB,
  stopMemoryDB,
  createUser,
  createAdmin,
  createOrder,
  createCategory,
  generateToken,
} from '../helpers/db.js';

let userToken;
let adminToken;
let orderId;
let categoryId;

beforeAll(async () => {
  await startMemoryDB();
  const { user } = await createUser();
  const { user: admin } = await createAdmin();
  userToken = generateToken(user._id);
  adminToken = generateToken(admin._id);

  const order = await createOrder({ buyer: user._id });
  orderId = order._id.toString();

  const cat = await createCategory();
  categoryId = cat._id.toString();
});

afterAll(() => stopMemoryDB());

// Admin-only GET routes
const adminGetRoutes = [
  '/api/v1/auth/all-orders',
  '/api/v1/auth/all-users',
];

describe('AUTHZ-01: Admin GET endpoints reject non-admin', () => {
  test.each(adminGetRoutes)(
    'GET %s — regular user token returns 401',
    async (path) => {
      const res = await request(app).get(path).set('Authorization', userToken);
      expect(res.status).toBe(401);
    }
  );

  test.each(adminGetRoutes)(
    'GET %s — no token returns 401',
    async (path) => {
      const res = await request(app).get(path);
      expect(res.status).toBe(401);
    }
  );
});

describe('AUTHZ-01: Order status update rejects non-admin', () => {
  test('PUT /api/v1/auth/order-status/:id — regular user returns 401', async () => {
    const res = await request(app)
      .put(`/api/v1/auth/order-status/${orderId}`)
      .set('Authorization', userToken)
      .send({ status: 'Shipped' });
    expect(res.status).toBe(401);
  });

  test('PUT /api/v1/auth/order-status/:id — no token returns 401', async () => {
    const res = await request(app)
      .put(`/api/v1/auth/order-status/${orderId}`)
      .send({ status: 'Shipped' });
    expect(res.status).toBe(401);
  });
});

describe('AUTHZ-01: Category management rejects non-admin', () => {
  test('POST /api/v1/category/create-category — regular user returns 401', async () => {
    const res = await request(app)
      .post('/api/v1/category/create-category')
      .set('Authorization', userToken)
      .send({ name: 'Injected Category' });
    expect(res.status).toBe(401);
  });

  test('POST /api/v1/category/create-category — no token returns 401', async () => {
    const res = await request(app)
      .post('/api/v1/category/create-category')
      .send({ name: 'Injected Category' });
    expect(res.status).toBe(401);
  });

  test('PUT /api/v1/category/update-category/:id — regular user returns 401', async () => {
    const res = await request(app)
      .put(`/api/v1/category/update-category/${categoryId}`)
      .set('Authorization', userToken)
      .send({ name: 'Injected' });
    expect(res.status).toBe(401);
  });

  test('PUT /api/v1/category/update-category/:id — no token returns 401', async () => {
    const res = await request(app)
      .put(`/api/v1/category/update-category/${categoryId}`)
      .send({ name: 'Injected' });
    expect(res.status).toBe(401);
  });

  test('DELETE /api/v1/category/delete-category/:id — regular user returns 401', async () => {
    const res = await request(app)
      .delete(`/api/v1/category/delete-category/${categoryId}`)
      .set('Authorization', userToken);
    expect(res.status).toBe(401);
  });

  test('DELETE /api/v1/category/delete-category/:id — no token returns 401', async () => {
    const res = await request(app)
      .delete(`/api/v1/category/delete-category/${categoryId}`);
    expect(res.status).toBe(401);
  });
});

describe('AUTHZ-01: Admin routes accept admin token', () => {
  test('GET /api/v1/auth/all-orders — admin returns 200', async () => {
    const res = await request(app)
      .get('/api/v1/auth/all-orders')
      .set('Authorization', adminToken);
    expect(res.status).toBe(200);
  });

  test('GET /api/v1/auth/all-users — admin returns 200', async () => {
    const res = await request(app)
      .get('/api/v1/auth/all-users')
      .set('Authorization', adminToken);
    expect(res.status).toBe(200);
  });

  test('PUT /api/v1/auth/order-status/:id — admin returns 200', async () => {
    const res = await request(app)
      .put(`/api/v1/auth/order-status/${orderId}`)
      .set('Authorization', adminToken)
      .send({ status: 'Processing' });
    expect(res.status).toBe(200);
  });

  test('POST /api/v1/category/create-category — admin returns 201', async () => {
    const res = await request(app)
      .post('/api/v1/category/create-category')
      .set('Authorization', adminToken)
      .send({ name: 'Admin Created' });
    expect([200, 201]).toContain(res.status);
  });

  test('PUT /api/v1/category/update-category/:id — admin returns 200', async () => {
    const res = await request(app)
      .put(`/api/v1/category/update-category/${categoryId}`)
      .set('Authorization', adminToken)
      .send({ name: 'Updated By Admin' });
    expect(res.status).toBe(200);
  });

  test('DELETE /api/v1/category/delete-category/:id — admin returns 200', async () => {
    // Create a fresh category to delete so we don't affect other tests
    const createRes = await request(app)
      .post('/api/v1/category/create-category')
      .set('Authorization', adminToken)
      .send({ name: 'To Delete' });
    const deleteCatId = createRes.body.category._id;
    const res = await request(app)
      .delete(`/api/v1/category/delete-category/${deleteCatId}`)
      .set('Authorization', adminToken);
    expect(res.status).toBe(200);
  });
});
