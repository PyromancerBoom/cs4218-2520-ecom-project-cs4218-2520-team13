// Priyansh Bimbisariye, A0265903B
// Credits to author of loadtest/testDbHelper. Mostly taken from there.
import express from "express";
import userModel from "../../../models/userModel.js";
import orderModel from "../../../models/orderModel.js";
import categoryModel from "../../../models/categoryModel.js";
import productModel from "../../../models/productModel.js";
import bcrypt from "bcryptjs";

export const soakTestRouter = express.Router();

const IDEAL_CATEGORIES = [
    { _id: '66db427fdb0119d9234b27ed', name: 'Electronics', slug: 'electronics' },
    { _id: '66db427fdb0119d9234b27ef', name: 'Book', slug: 'book' },
    { _id: '66db427fdb0119d9234b27ee', name: 'Clothing', slug: 'clothing' }
];

const IDEAL_PRODUCTS = [
    { _id: '66db427fdb0119d9234b27f1', name: 'Textbook', slug: 'textbook', description: 'A comprehensive textbook', price: 79.99, category: '66db427fdb0119d9234b27ef' },
    { _id: '66db427fdb0119d9234b27f3', name: 'Laptop', slug: 'laptop', description: 'A powerful laptop', price: 1499.99, category: '66db427fdb0119d9234b27ed' },
    { _id: '66db427fdb0119d9234b27f5', name: 'Smartphone', slug: 'smartphone', description: 'A high-end smartphone', price: 999.99, category: '66db427fdb0119d9234b27ed' },
    { _id: '66db427fdb0119d9234b27f9', name: 'Novel', slug: 'novel', description: 'A bestselling novel', price: 14.99, category: '66db427fdb0119d9234b27ef' },
    { _id: '67a2171ea6d9e00ef2ac0229', name: 'The Law of Contract in Singapore', slug: 'the-law-of-contract-in-singapore', description: 'A bestselling book in Singapore', price: 54.99, category: '66db427fdb0119d9234b27ef' },
    { _id: '67a21772a6d9e00ef2ac022a', name: 'NUS T-shirt', slug: 'nus-t-shirt', description: 'Plain NUS T-shirt for sale', price: 4.99, category: '66db427fdb0119d9234b27ee' }
];

// Creates test users, categories, and products if they don't already exist.
// Uses fixed ObjectIDs so K6 can reference products by hardcoded ID in config.js.
soakTestRouter.post("/seed", async (req, res) => {
    try {
        const mockImageBuffer = Buffer.alloc(1024 * 100, 'x'); // 100KB dummy image

        if (req.body.users && req.body.users.length > 0) {
            const hashedPassword = await bcrypt.hash("password123", 10);
            const incomingEmails = req.body.users.map(u => u.email);
            const existingUsers = await userModel.find({ email: { $in: incomingEmails } });
            const existingEmails = existingUsers.map(u => u.email);

            const usersToInsert = req.body.users
                .filter(u => !existingEmails.includes(u.email))
                .map((u, index) => ({
                    name: `Test User ${index}`,
                    email: u.email,
                    password: hashedPassword,
                    phone: "81234567",
                    address: "NUS",
                    answer: "Singapore",
                    role: 0
                }));

            if (usersToInsert.length > 0) {
                await userModel.insertMany(usersToInsert);
            }
        }

        for (const c of IDEAL_CATEGORIES) {
            const exists = await categoryModel.findById(c._id);
            if (!exists) {
                await new categoryModel(c).save();
            }
        }

        for (const p of IDEAL_PRODUCTS) {
            const exists = await productModel.findById(p._id);
            if (!exists) {
                await new productModel({
                    ...p,
                    quantity: 1000,
                    shipping: true,
                    photo: {
                        data: mockImageBuffer,
                        contentType: "image/jpeg"
                    }
                }).save();
            }
        }

        const mappedProducts = IDEAL_PRODUCTS.map(p => ({
            pid: p._id.toString(),
            cid: p.category,
            slug: p.slug,
            name: p.name,
            price: p.price
        }));

        res.status(200).send({ success: true, products: mappedProducts });
    } catch (error) {
        res.status(500).send({ success: false, error });
    }
});

// Counts orders created by soak test users — used as a throughput metric
soakTestRouter.get("/order-count", async (req, res) => {
    try {
        const testUsers = await userModel.find({ email: { $regex: "soaktest_user" } });
        const testUserIds = testUsers.map(user => user._id);
        const count = await orderModel.countDocuments({ buyer: { $in: testUserIds } });
        res.status(200).send({ success: true, count });
    } catch (error) {
        res.status(500).send({ success: false, error });
    }
});

// Deletes all soak test data: users, orders, products, and categories.
// Categories are seeded with fixed IDs and cleaned up here to avoid accumulation across runs.
soakTestRouter.delete("/cleanup", async (req, res) => {
    try {
        const testUsers = await userModel.find({ email: { $regex: "soaktest_user" } });
        const testUserIds = testUsers.map(user => user._id);

        await orderModel.deleteMany({ buyer: { $in: testUserIds } });
        await userModel.deleteMany({ _id: { $in: testUserIds } });

        const productIds = IDEAL_PRODUCTS.map(p => p._id);
        await productModel.deleteMany({ _id: { $in: productIds } });

        const categoryIds = IDEAL_CATEGORIES.map(c => c._id);
        await categoryModel.deleteMany({ _id: { $in: categoryIds } });

        res.status(200).send({ success: true });
    } catch (error) {
        res.status(500).send({ success: false, error });
    }
});

// Returns Node.js process memory stats sampled from inside the runtime.
// heapUsed trending upward across GC cycles over time = memory leak signal.
// rss - heapUsed widening = off-heap allocations (Buffers, native modules).
soakTestRouter.get("/metrics", (req, res) => {
    const mem = process.memoryUsage();
    res.json({
        heapUsed: mem.heapUsed,
        heapTotal: mem.heapTotal,
        rss: mem.rss,
        external: mem.external,
    });
});
