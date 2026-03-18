// Integration tests for PUT /api/v1/auth/profile (user profile update)
import request from 'supertest';
import bcrypt from 'bcrypt';
import app from '../../server.js';
import userModel from '../../models/userModel.js';
import {
  startMemoryDB, stopMemoryDB, clearCollections,
  createUser, generateToken,
} from '../helpers/db.js';

// LOW WEI SHENG, A0259272X
describe('PUT /api/v1/auth/profile', () => {
  beforeAll(startMemoryDB);
  afterAll(stopMemoryDB);
  afterEach(clearCollections);

  // LOW WEI SHENG, A0259272X
  it('updates name, phone, and address and returns updated user', async () => {
    const { user } = await createUser();
    const token = generateToken(user._id);

    const res = await request(app)
      .put('/api/v1/auth/profile')
      .set('Authorization', token)
      .send({ name: 'New Name', phone: '99998888', address: '456 New Road' });

    expect(res.status).toBe(200);
    expect(res.body.updatedUser.name).toBe('New Name');
    expect(res.body.updatedUser.phone).toBe('99998888');
    expect(res.body.updatedUser.address).toBe('456 New Road');
  });

  // LOW WEI SHENG, A0259272X
  it('BUG-01 (fixed): response does not include password field', async () => {
    const { user } = await createUser();
    const token = generateToken(user._id);

    const res = await request(app)
      .put('/api/v1/auth/profile')
      .set('Authorization', token)
      .send({ name: 'Updated Name' });

    expect(res.status).toBe(200);
    expect(res.body.updatedUser.password).toBeUndefined();
  });

  // LOW WEI SHENG, A0259272X
  it('updates password: new password works at login, old password does not', async () => {
    const { user, plainPassword: oldPassword } = await createUser();
    const token = generateToken(user._id);
    const newPassword = 'newSecurePass99';

    await request(app)
      .put('/api/v1/auth/profile')
      .set('Authorization', token)
      .send({ password: newPassword });

    const updatedUser = await userModel.findById(user._id);
    const newHashWorks = await bcrypt.compare(newPassword, updatedUser.password);
    const oldHashFails = await bcrypt.compare(oldPassword, updatedUser.password);

    expect(newHashWorks).toBe(true);
    expect(oldHashFails).toBe(false);
  });

  // LOW WEI SHENG, A0259272X
  it('stores a new bcrypt hash distinct from the original', async () => {
    const { user } = await createUser();
    const originalHash = user.password;
    const token = generateToken(user._id);

    await request(app)
      .put('/api/v1/auth/profile')
      .set('Authorization', token)
      .send({ password: 'brandnewpass123' });

    const updated = await userModel.findById(user._id);
    expect(updated.password).not.toBe(originalHash);
  });

  // LOW WEI SHENG, A0259272X
  it('rejects password shorter than 6 characters', async () => {
    const { user } = await createUser();
    const token = generateToken(user._id);

    const res = await request(app)
      .put('/api/v1/auth/profile')
      .set('Authorization', token)
      .send({ password: 'abc' });

    expect(res.body.error).toMatch(/6 character/i);
  });

  // LOW WEI SHENG, A0259272X
  it('BUG-05 boundary: empty string password leaves existing password unchanged', async () => {
    const { user, plainPassword } = await createUser();
    const token = generateToken(user._id);

    await request(app)
      .put('/api/v1/auth/profile')
      .set('Authorization', token)
      .send({ password: "" });

    const unchanged = await userModel.findById(user._id);
    const stillWorks = await bcrypt.compare(plainPassword, unchanged.password);
    expect(stillWorks).toBe(true);
  });

  // LOW WEI SHENG, A0259272X
  it('does not update email field even if provided in body', async () => {
    const { user } = await createUser({ email: 'original@test.com' });
    const token = generateToken(user._id);

    await request(app)
      .put('/api/v1/auth/profile')
      .set('Authorization', token)
      .send({ email: 'hacker@test.com' });

    const unchanged = await userModel.findById(user._id);
    expect(unchanged.email).toBe('original@test.com');
  });

  // LOW WEI SHENG, A0259272X
  it('partial update (phone only) leaves other fields unchanged', async () => {
    const { user } = await createUser({ name: 'Alice', address: 'Old Address' });
    const token = generateToken(user._id);

    const res = await request(app)
      .put('/api/v1/auth/profile')
      .set('Authorization', token)
      .send({ phone: '11112222' });

    expect(res.status).toBe(200);
    expect(res.body.updatedUser.name).toBe('Alice');
    expect(res.body.updatedUser.address).toBe('Old Address');
    expect(res.body.updatedUser.phone).toBe('11112222');
  });

  // LOW WEI SHENG, A0259272X
  it('BUG-05 (fixed): empty string phone persists and does not fall back to old value', async () => {
    const { user } = await createUser({ phone: '12345678' });
    const token = generateToken(user._id);

    const res = await request(app)
      .put('/api/v1/auth/profile')
      .set('Authorization', token)
      .send({ phone: '' });

    expect(res.status).toBe(200);
    expect(res.body.updatedUser.phone).toBe('');
  });

  // LOW WEI SHENG, A0259272X
  it('returns 401 when unauthenticated', async () => {
    const res = await request(app)
      .put('/api/v1/auth/profile')
      .send({ name: 'No Auth' });

    expect(res.status).toBe(401);
  });
});
