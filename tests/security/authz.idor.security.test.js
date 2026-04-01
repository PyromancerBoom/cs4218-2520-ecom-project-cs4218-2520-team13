import request from 'supertest';
import app from '../../server.js';
import {
  startMemoryDB,
  stopMemoryDB,
  createUser,
  createOrder,
  generateToken,
} from '../helpers/db.js';

let userAToken;
let userBId;
let userBOrderId;

beforeAll(async () => {
  await startMemoryDB();
  const { user: userA } = await createUser();
  const { user: userB } = await createUser();

  userAToken = generateToken(userA._id);
  userBId = userB._id;

  // Create an order belonging to User B only
  const orderB = await createOrder({ buyer: userB._id, products: [] });
  userBOrderId = orderB._id.toString();
});

afterAll(() => stopMemoryDB());

describe('AUTHZ-02: IDOR — User-Scoped Order Isolation', () => {
  test("User A's token cannot retrieve User B's orders", async () => {
    const res = await request(app)
      .get('/api/v1/auth/orders')
      .set('Authorization', userAToken);

    expect(res.status).toBe(200);

    // None of the returned orders should belong to User B
    const orders = res.body.orders ?? [];
    const leak = orders.some(
      (order) => order.buyer?._id?.toString() === userBId.toString()
    );
    expect(leak).toBe(false);
  });

  test("User B's order ID does not appear in User A's order list", async () => {
    const res = await request(app)
      .get('/api/v1/auth/orders')
      .set('Authorization', userAToken);

    const orders = res.body.orders ?? [];
    const orderIds = orders.map((o) => o._id.toString());
    expect(orderIds).not.toContain(userBOrderId);
  });
});
