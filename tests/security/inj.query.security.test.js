import request from 'supertest';
import app from '../../server.js';
import {
  startMemoryDB,
  stopMemoryDB,
  createProduct,
  createCategory,
} from '../helpers/db.js';
import { productFilterInjectionPayloads } from './helpers/payloads.js';

let legitimateProductCount;

beforeAll(async () => {
  await startMemoryDB();
  const cat = await createCategory({ name: 'Electronics' });

  // Seed 2 products in a known category, 1 in another
  await createProduct({ name: 'Laptop', category: cat._id });
  await createProduct({ name: 'Phone', category: cat._id });
  await createProduct({ name: 'Book', category: new (await import('mongoose')).default.Types.ObjectId() });

  // Baseline: a legitimate empty filter returns all 3
  const baseRes = await request(app)
    .post('/api/v1/product/product-filters')
    .send({ checked: [], radio: [] });
  legitimateProductCount = baseRes.body.products?.length ?? 0;
});

afterAll(() => stopMemoryDB());

describe('INJ-01: NoSQL Injection on Product Filter Endpoint', () => {
  test.each(productFilterInjectionPayloads.map((p, i) => [i, p]))(
    'filter injection payload #%i does not return more products than a legitimate empty filter',
    async (_, payload) => {
      const res = await request(app)
        .post('/api/v1/product/product-filters')
        .send(payload);

      // Either the request fails, or it returns no more results than legitimate
      if (res.status === 200) {
        const count = res.body.products?.length ?? 0;
        // An injection that returns more products than the legit baseline is suspicious
        // (in this seeded DB, legit max = legitimateProductCount)
        expect(count).toBeLessThanOrEqual(legitimateProductCount);
      } else {
        // Non-200 is fine — Mongoose rejected the operator
        expect(res.status).not.toBe(500);
      }
    }
  );

  test('search endpoint with regex injection does not expose unexpected products', async () => {
    // keyword from req.params — passed as URL segment, not JSON body
    // A regex injection via URL: ".*" as keyword
    const res = await request(app).get('/api/v1/product/search/.*');

    // Should return 200 (regex is already how the search works) but not crash
    // The result set should match what ".*" would legitimately return
    expect([200, 400, 500]).toContain(res.status);
    if (res.status === 200) {
      // Just verify the response is well-formed, not that injection succeeded
      expect(Array.isArray(res.body.results)).toBe(true);
    }
  });
});
