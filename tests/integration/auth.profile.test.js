// tests/integration/auth.profile.test.js
// Wei Sheng, A0259272X
import request from 'supertest';
import app from '../../server.js';
import {
  startMemoryDB, stopMemoryDB, clearCollections,
  createUser, generateToken,
} from '../helpers/db.js';

describe('PUT /api/v1/auth/profile', () => {
  beforeAll(startMemoryDB);
  afterAll(stopMemoryDB);
  afterEach(clearCollections);

  it('BUG-01: response does not include password field', async () => {
    const { user } = await createUser();
    const token = generateToken(user._id);

    const res = await request(app)
      .put('/api/v1/auth/profile')
      .set('Authorization', token)
      .send({ name: 'Updated Name' });

    expect(res.status).toBe(200);
    expect(res.body.updatedUser.password).toBeUndefined();
  });

  it('BUG-05: empty string phone persists and does not fall back to old value', async () => {
    const { user } = await createUser({ phone: '12345678' });
    const token = generateToken(user._id);

    const res = await request(app)
      .put('/api/v1/auth/profile')
      .set('Authorization', token)
      .send({ phone: '' });

    expect(res.status).toBe(200);
    expect(res.body.updatedUser.phone).toBe('');
  });
});
