// Connects to the local test MongoDB for E2E seed and teardown.
// The E2E server (Express) also connects to the same MONGO_URL.
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import userModel from '../../models/userModel.js';
import orderModel from '../../models/orderModel.js';
import productModel from '../../models/productModel.js';

const TEST_DB_URL = process.env.MONGO_URL || 'mongodb://localhost:27017/ecom-test';

// LOW WEI SHENG, A0259272X
export const connectTestDB = async () => {
    if (mongoose.connection.readyState === 0) {
        await mongoose.connect(TEST_DB_URL);
    }
};

// LOW WEI SHENG, A0259272X
export const disconnectTestDB = async () => {
    await mongoose.disconnect();
};

// LOW WEI SHENG, A0259272X
export const clearTestCollections = async () => {
    await Promise.all([
        userModel.deleteMany({}),
        orderModel.deleteMany({}),
        productModel.deleteMany({}),
    ]);
};

// LOW WEI SHENG, A0259272X
export const seedUser = async (overrides = {}) => {
    const plainPassword = overrides.plainPassword || 'password123';
    const hashed = await bcrypt.hash(plainPassword, 10);
    const user = await userModel.create({
        name: 'E2E User',
        email: `e2e-user-${Date.now()}@test.com`,
        phone: '12345678',
        address: '1 E2E Street',
        answer: 'test',
        role: 0,
        ...overrides,
        password: hashed,
    });
    return { user, plainPassword };
};

// LOW WEI SHENG, A0259272X
export const seedAdmin = async (overrides = {}) => {
    return seedUser({ role: 1, name: 'E2E Admin', ...overrides });
};

// LOW WEI SHENG, A0259272X
export const seedProduct = async (overrides = {}) => {
    return productModel.create({
        name: 'E2E Product',
        slug: `e2e-product-${Date.now()}`,
        description: 'An E2E test product with sufficient description length.',
        price: 49.99,
        category: new mongoose.Types.ObjectId(),
        quantity: 5,
        ...overrides,
    });
};

// LOW WEI SHENG, A0259272X
export const seedOrder = async (overrides = {}) => {
    return orderModel.create({
        products: [],
        payment: { success: true },
        buyer: new mongoose.Types.ObjectId(),
        status: 'Not Process',
        ...overrides,
    });
};
