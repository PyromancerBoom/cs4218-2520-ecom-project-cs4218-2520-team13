// Shared helpers for backend integration tests and E2E seed/teardown.
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import JWT from 'jsonwebtoken';
import userModel from '../../models/userModel.js';
import orderModel from '../../models/orderModel.js';
import productModel from '../../models/productModel.js';

let mongod;

/** Start an in-memory MongoDB and connect mongoose to it. Call in beforeAll. */
// LOW WEI SHENG, A0259272X
export const startMemoryDB = async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
};

/** Disconnect mongoose and stop the in-memory server. Call in afterAll. */
// LOW WEI SHENG, A0259272X
export const stopMemoryDB = async () => {
  await mongoose.disconnect();
  await mongod.stop();
};

/** Delete all documents from all collections. Call in afterEach for mutation tests. */
// LOW WEI SHENG, A0259272X
export const clearCollections = async () => {
  for (const collection of Object.values(mongoose.connection.collections)) {
    await collection.deleteMany({});
  }
};

/**
 * Insert a regular user (role 0).
 * Returns { user, plainPassword } — plainPassword is needed to call generateToken().
 */
// LOW WEI SHENG, A0259272X
export const createUser = async (overrides = {}) => {
  const plainPassword = overrides.plainPassword || 'password123';
  const hashed = await bcrypt.hash(plainPassword, 10);
  const user = await userModel.create({
    name: 'Test User',
    email: `user-${Date.now()}-${Math.random()}@test.com`,
    phone: '12345678',
    address: '123 Test Street',
    answer: 'test answer',
    role: 0,
    ...overrides,
    password: hashed, // always hash regardless of overrides
  });
  return { user, plainPassword };
};

/**
 * Insert an admin user (role 1).
 * Returns { user, plainPassword }.
 */
// LOW WEI SHENG, A0259272X
export const createAdmin = async (overrides = {}) => {
  return createUser({ role: 1, name: 'Test Admin', ...overrides });
};

/**
 * Insert a product. Requires a valid category ObjectId.
 * Generates a unique slug automatically.
 */
// LOW WEI SHENG, A0259272X
export const createProduct = async (overrides = {}) => {
  const slug = `test-product-${Date.now()}-${Math.random()}`;
  return productModel.create({
    name: 'Test Product',
    slug,
    description: 'A test product with a description longer than thirty characters.',
    price: 99.99,
    category: new mongoose.Types.ObjectId(),
    quantity: 10,
    ...overrides,
  });
};

/**
 * Insert an order.
 * Pass buyer: user._id and products: [product._id] in overrides.
 */
// LOW WEI SHENG, A0259272X
export const createOrder = async (overrides = {}) => {
  return orderModel.create({
    products: [],
    payment: { success: true },
    buyer: new mongoose.Types.ObjectId(),
    status: 'Not Processed',
    ...overrides,
  });
};

/**
 * Generate a signed JWT for the given user _id.
 * Uses the same JWT_SECRET that authMiddleware reads.
 */
// LOW WEI SHENG, A0259272X
export const generateToken = (userId) => {
  return JWT.sign(
    { _id: userId },
    process.env.JWT_SECRET || 'test-jwt-secret-for-integration-tests',
    { expiresIn: '7d' }
  );
};
