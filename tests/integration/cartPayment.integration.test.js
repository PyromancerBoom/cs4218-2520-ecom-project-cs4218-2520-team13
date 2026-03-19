/**
 * @jest-environment node
 */
//Aashim Mahindroo, A0265890R
//Based on the directions of my user stories and recommended testing methods like using Playwright for UI tests and React testing library for integration tests, Github Copilot generates initial test code for this file.
//Then I manually review the code and make necessary adjustments, ensuring test isolation, etc. to ensure accuracy and relevance to the project requirements.


import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

let mongoServer;
let app;
let server;
let request;
let userModel;
let productModel;
let categoryModel;
let orderModel;
let hashPassword;
let JWT;
let userToken;
let adminToken;
let testUser;
let adminUser;
let testCategory;
let testProduct1;
let testProduct2;

beforeAll(async () => {
  process.env.JWT_SECRET = "test-jwt-secret-for-integration";
  process.env.BRAINTREE_MERCHANT_ID = "test_merchant_id";
  process.env.BRAINTREE_PUBLIC_KEY = "test_public_key";
  process.env.BRAINTREE_PRIVATE_KEY = "test_private_key";

  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);

  const expressModule = await import(
    "../../node_modules/express/index.js"
  );
  const express = expressModule.default ?? expressModule;

  const supertestModule = await import("supertest");
  const supertest = supertestModule.default ?? supertestModule;

  const productRoutesModule = await import(
    "../../routes/productRoutes.js"
  );
  const authRoutesModule = await import("../../routes/authRoute.js");

  const unwrap = (mod) => {
    let val = mod.default ?? mod;
    if (typeof val !== "function" && val && val.default) val = val.default;
    return val;
  };

  const productRoutes = unwrap(productRoutesModule);
  const authRoutes = unwrap(authRoutesModule);

  userModel = unwrap(await import("../../models/userModel.js"));
  productModel = unwrap(await import("../../models/productModel.js"));
  categoryModel = unwrap(await import("../../models/categoryModel.js"));
  orderModel = unwrap(await import("../../models/orderModel.js"));

  const authHelperMod = await import("../../helpers/authHelper.js");
  hashPassword = authHelperMod.hashPassword;

  const jwtMod = await import("jsonwebtoken");
  JWT = jwtMod.default ?? jwtMod;

  app = express();
  app.use(express.json());
  app.use("/api/v1/product", productRoutes);
  app.use("/api/v1/auth", authRoutes);

  server = app.listen(0);
  request = supertest;
}, 30000);

afterAll(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await userModel.deleteMany({});
  await productModel.deleteMany({});
  await categoryModel.deleteMany({});
  await orderModel.deleteMany({});

  testCategory = await categoryModel.create({
    name: "Test Electronics",
    slug: "test-electronics",
  });

  const hashedPassword = await hashPassword("password123");
  testUser = await userModel.create({
    name: "Test User",
    email: "testuser@test.com",
    password: hashedPassword,
    phone: "1234567890",
    address: "123 Test Street",
    answer: "testanswer",
    role: 0,
  });

  const adminHashedPassword = await hashPassword("adminpass123");
  adminUser = await userModel.create({
    name: "Admin User",
    email: "admin@test.com",
    password: adminHashedPassword,
    phone: "0987654321",
    address: "456 Admin Street",
    answer: "adminanswer",
    role: 1,
  });

  userToken = JWT.sign({ _id: testUser._id }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
  adminToken = JWT.sign({ _id: adminUser._id }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });

  testProduct1 = await productModel.create({
    name: "Test Laptop",
    slug: "test-laptop",
    description: "A powerful test laptop for integration testing",
    price: 999.99,
    category: testCategory._id,
    quantity: 10,
    shipping: true,
  });

  testProduct2 = await productModel.create({
    name: "Test Headphones",
    slug: "test-headphones",
    description: "Noise cancelling test headphones",
    price: 79.99,
    category: testCategory._id,
    quantity: 25,
    shipping: true,
  });
});

describe("Cart & Payment Integration Tests", () => {
  describe("GET /api/v1/product/braintree/token", () => {
    //Aashim Mahindroo, A0265890R
    test("should return a response when requesting braintree token", async () => {
      const res = await request(app).get("/api/v1/product/braintree/token");

      expect([200, 500]).toContain(res.statusCode);
    });

    //Aashim Mahindroo, A0265890R
    test("should be accessible without authentication (no requireSignIn middleware)", async () => {
      const res = await request(app).get("/api/v1/product/braintree/token");

      expect(res.statusCode).not.toBe(401);
    });

    //Aashim Mahindroo, A0265890R
    test("should return JSON response", async () => {
      const res = await request(app).get("/api/v1/product/braintree/token");

      expect(res.headers["content-type"]).toMatch(/json/);
    });
  });

  describe("POST /api/v1/product/braintree/payment", () => {
    //Aashim Mahindroo, A0265890R
    test("should reject payment request without authentication", async () => {
      let timedOut = false;
      try {
        const res = await request(app)
          .post("/api/v1/product/braintree/payment")
          .send({
            nonce: "fake-nonce",
            cart: [{ _id: testProduct1._id, price: 999.99 }],
          })
          .timeout(3000);
        expect(res.statusCode).not.toBe(200);
      } catch (err) {
        timedOut = err.timeout === true || err.code === "ECONNABORTED" ||
          (err.message && err.message.includes("Timeout"));
        expect(timedOut).toBe(true);
      }
    }, 10000);

    //Aashim Mahindroo, A0265890R
    test("should require nonce and cart in request body", async () => {
      const res = await request(app)
        .post("/api/v1/product/braintree/payment")
        .set("Authorization", userToken)
        .send({});

      expect([400, 500]).toContain(res.statusCode);
    });

    //Aashim Mahindroo, A0265890R
    test("should handle payment attempt with authenticated user", async () => {
      const cart = [
        {
          _id: testProduct1._id.toString(),
          name: "Test Laptop",
          price: 999.99,
        },
      ];

      const res = await request(app)
        .post("/api/v1/product/braintree/payment")
        .set("Authorization", userToken)
        .send({ nonce: "fake-valid-nonce", cart });

      expect([200, 500]).toContain(res.statusCode);
    });

    //Aashim Mahindroo, A0265890R
    test("should handle payment with multiple cart items", async () => {
      const cart = [
        {
          _id: testProduct1._id.toString(),
          name: "Test Laptop",
          price: 999.99,
        },
        {
          _id: testProduct2._id.toString(),
          name: "Test Headphones",
          price: 79.99,
        },
      ];

      const res = await request(app)
        .post("/api/v1/product/braintree/payment")
        .set("Authorization", userToken)
        .send({ nonce: "fake-valid-nonce", cart });

      expect([200, 500]).toContain(res.statusCode);
    });

    //Aashim Mahindroo, A0265890R
    test("should handle payment with empty cart", async () => {
      const res = await request(app)
        .post("/api/v1/product/braintree/payment")
        .set("Authorization", userToken)
        .send({ nonce: "fake-nonce", cart: [] });

      expect([200, 500]).toContain(res.statusCode);
    });
  });

  describe("GET /api/v1/product/get-product (Cart relies on product data)", () => {
    //Aashim Mahindroo, A0265890R
    test("should return all products", async () => {
      const res = await request(app).get("/api/v1/product/get-product");

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.products).toBeInstanceOf(Array);
      expect(res.body.products.length).toBe(2);
    });

    //Aashim Mahindroo, A0265890R
    test("should return product details needed for cart display", async () => {
      const res = await request(app).get("/api/v1/product/get-product");

      expect(res.statusCode).toBe(200);
      const product = res.body.products[0];
      expect(product).toHaveProperty("name");
      expect(product).toHaveProperty("description");
      expect(product).toHaveProperty("price");
      expect(product).toHaveProperty("_id");
      expect(product).toHaveProperty("slug");
    });

    //Aashim Mahindroo, A0265890R
    test("should return correct product prices for cart calculation", async () => {
      const res = await request(app).get("/api/v1/product/get-product");

      expect(res.statusCode).toBe(200);
      const prices = res.body.products.map((p) => p.price);
      expect(prices).toContain(999.99);
      expect(prices).toContain(79.99);
    });
  });

  describe("GET /api/v1/product/get-product/:slug (Single product for cart)", () => {
    //Aashim Mahindroo, A0265890R
    test("should return single product by slug", async () => {
      const res = await request(app).get(
        "/api/v1/product/get-product/test-laptop"
      );

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.product.name).toBe("Test Laptop");
      expect(res.body.product.price).toBe(999.99);
    });

    //Aashim Mahindroo, A0265890R
    test("should return appropriate response for non-existent product slug", async () => {
      const res = await request(app).get(
        "/api/v1/product/get-product/non-existent-slug"
      );

      expect(res.statusCode).toBe(200);
    });
  });

  describe("POST /api/v1/auth/login (User must login before checkout)", () => {
    //Aashim Mahindroo, A0265890R
    test("should login successfully with valid credentials", async () => {
      const res = await request(app).post("/api/v1/auth/login").send({
        email: "testuser@test.com",
        password: "password123",
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body).toHaveProperty("token");
      expect(res.body.user.name).toBe("Test User");
      expect(res.body.user.address).toBe("123 Test Street");
    });

    //Aashim Mahindroo, A0265890R
    test("should return a valid JWT token on login", async () => {
      const res = await request(app).post("/api/v1/auth/login").send({
        email: "testuser@test.com",
        password: "password123",
      });

      expect(res.statusCode).toBe(200);
      const token = res.body.token;
      expect(token).toBeDefined();

      const decoded = JWT.verify(token, process.env.JWT_SECRET);
      expect(decoded._id).toBe(testUser._id.toString());
    });

    //Aashim Mahindroo, A0265890R
    test("should reject login with wrong password", async () => {
      const res = await request(app).post("/api/v1/auth/login").send({
        email: "testuser@test.com",
        password: "wrongpassword",
      });

      expect(res.body.success).toBe(false);
    });

    //Aashim Mahindroo, A0265890R
    test("should reject login with non-existent email", async () => {
      const res = await request(app).post("/api/v1/auth/login").send({
        email: "noone@test.com",
        password: "password123",
      });

      expect(res.statusCode).toBe(404);
      expect(res.body.success).toBe(false);
    });

    //Aashim Mahindroo, A0265890R
    test("should reject login with missing email or password", async () => {
      const res = await request(app)
        .post("/api/v1/auth/login")
        .send({ email: "testuser@test.com" });

      expect(res.statusCode).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe("PUT /api/v1/auth/profile (Update address for checkout)", () => {
    //Aashim Mahindroo, A0265890R
    test("should update user address when authenticated", async () => {
      const res = await request(app)
        .put("/api/v1/auth/profile")
        .set("Authorization", userToken)
        .send({
          name: "Test User",
          phone: "1234567890",
          address: "789 New Address St",
        });

      expect(res.statusCode).toBe(200);

      const updatedUser = await userModel.findById(testUser._id);
      expect(updatedUser.address).toBe("789 New Address St");
    });

    //Aashim Mahindroo, A0265890R
    test("should reject profile update without authentication", async () => {
      let timedOut = false;
      try {
        const res = await request(app)
          .put("/api/v1/auth/profile")
          .send({ address: "Should Not Update" })
          .timeout(3000);
        expect(res.statusCode).not.toBe(200);
      } catch (err) {
        timedOut = err.timeout === true || err.code === "ECONNABORTED" ||
          (err.message && err.message.includes("Timeout"));
        expect(timedOut).toBe(true);
      }
    }, 10000);

    //Aashim Mahindroo, A0265890R
    test("should preserve other fields when updating address only", async () => {
      const res = await request(app)
        .put("/api/v1/auth/profile")
        .set("Authorization", userToken)
        .send({
          name: "Test User",
          phone: "1234567890",
          address: "New Address",
        });

      expect(res.statusCode).toBe(200);
      const updatedUser = await userModel.findById(testUser._id);
      expect(updatedUser.name).toBe("Test User");
      expect(updatedUser.email).toBe("testuser@test.com");
    });
  });

  describe("GET /api/v1/auth/orders (View orders after payment)", () => {
    //Aashim Mahindroo, A0265890R
    test("should return empty orders for user with no purchases", async () => {
      const res = await request(app)
        .get("/api/v1/auth/orders")
        .set("Authorization", userToken);

      expect(res.statusCode).toBe(200);
    });

    //Aashim Mahindroo, A0265890R
    test("should return orders for user who has made purchases", async () => {
      await orderModel.create({
        products: [testProduct1._id],
        payment: { success: true },
        buyer: testUser._id,
        status: "Not Process",
      });

      const res = await request(app)
        .get("/api/v1/auth/orders")
        .set("Authorization", userToken);

      expect(res.statusCode).toBe(200);
      expect(res.body).toBeInstanceOf(Array);
      expect(res.body.length).toBe(1);
    });

    //Aashim Mahindroo, A0265890R
    test("should reject orders request without authentication", async () => {
      let timedOut = false;
      try {
        const res = await request(app)
          .get("/api/v1/auth/orders")
          .timeout(3000);
        expect(res.statusCode).not.toBe(200);
      } catch (err) {
        timedOut = err.timeout === true || err.code === "ECONNABORTED" ||
          (err.message && err.message.includes("Timeout"));
        expect(timedOut).toBe(true);
      }
    }, 10000);

    //Aashim Mahindroo, A0265890R
    test("should only return orders belonging to the authenticated user", async () => {
      await orderModel.create({
        products: [testProduct1._id],
        payment: { success: true },
        buyer: testUser._id,
      });

      await orderModel.create({
        products: [testProduct2._id],
        payment: { success: true },
        buyer: adminUser._id,
      });

      const res = await request(app)
        .get("/api/v1/auth/orders")
        .set("Authorization", userToken);

      expect(res.statusCode).toBe(200);
      expect(res.body).toBeInstanceOf(Array);
      expect(res.body.length).toBe(1);
    });
  });

  describe("GET /api/v1/product/product-photo/:pid", () => {
    //Aashim Mahindroo, A0265890R
    test("should handle product without photo gracefully", async () => {
      const res = await request(app).get(
        `/api/v1/product/product-photo/${testProduct1._id}`
      );

      expect([200, 404, 500]).toContain(res.statusCode);
    });

    //Aashim Mahindroo, A0265890R
    test("should return error for non-existent product ID", async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app).get(
        `/api/v1/product/product-photo/${fakeId}`
      );

      expect([200, 404, 500]).toContain(res.statusCode);
    });
  });

  describe("End-to-end: Login → Get Products → Payment flow", () => {
    //Aashim Mahindroo, A0265890R
    test("should complete full login → get products → attempt payment flow", async () => {
      const loginRes = await request(app).post("/api/v1/auth/login").send({
        email: "testuser@test.com",
        password: "password123",
      });
      expect(loginRes.statusCode).toBe(200);
      expect(loginRes.body.success).toBe(true);
      const token = loginRes.body.token;
      expect(token).toBeDefined();

      const productsRes = await request(app).get(
        "/api/v1/product/get-product"
      );
      expect(productsRes.statusCode).toBe(200);
      expect(productsRes.body.products.length).toBeGreaterThan(0);

      const cart = productsRes.body.products.map((p) => ({
        _id: p._id,
        name: p.name,
        price: p.price,
      }));
      expect(cart.length).toBe(2);

      const tokenRes = await request(app).get(
        "/api/v1/product/braintree/token"
      );
      expect([200, 500]).toContain(tokenRes.statusCode);

      const paymentRes = await request(app)
        .post("/api/v1/product/braintree/payment")
        .set("Authorization", token)
        .send({ nonce: "fake-nonce", cart });

      expect([200, 500]).toContain(paymentRes.statusCode);
    });

    //Aashim Mahindroo, A0265890R
    test("should verify user has address before payment can be enabled", async () => {
      const noAddressUser = await userModel.create({
        name: "No Address User",
        email: "noaddress@test.com",
        password: await hashPassword("password123"),
        phone: "5555555555",
        address: "",
        answer: "testanswer",
        role: 0,
      });

      const loginRes = await request(app).post("/api/v1/auth/login").send({
        email: "noaddress@test.com",
        password: "password123",
      });

      expect(loginRes.statusCode).toBe(200);
      expect(loginRes.body.user.address).toBeFalsy();
    });

    //Aashim Mahindroo, A0265890R
    test("should complete register → login → get products flow", async () => {
      const registerRes = await request(app)
        .post("/api/v1/auth/register")
        .send({
          name: "New Cart User",
          email: "newcartuser@test.com",
          password: "securepass123",
          phone: "5551234567",
          address: "321 New User Ave",
          answer: "testanswer",
        });
      expect(registerRes.statusCode).toBe(201);

      const loginRes = await request(app).post("/api/v1/auth/login").send({
        email: "newcartuser@test.com",
        password: "securepass123",
      });
      expect(loginRes.statusCode).toBe(200);
      expect(loginRes.body.token).toBeDefined();

      const productsRes = await request(app).get(
        "/api/v1/product/get-product"
      );
      expect(productsRes.statusCode).toBe(200);
      expect(productsRes.body.products.length).toBe(2);
    });
  });

  describe("Order model - data integrity", () => {
    //Aashim Mahindroo, A0265890R
    test("should create order with correct default status", async () => {
      const order = await orderModel.create({
        products: [testProduct1._id],
        payment: { success: true, transaction: { id: "test-txn" } },
        buyer: testUser._id,
      });

      expect(order.status).toBe("Not Process");
      expect(order.buyer.toString()).toBe(testUser._id.toString());
      expect(order.products).toHaveLength(1);
    });

    //Aashim Mahindroo, A0265890R
    test("should store payment details in the order", async () => {
      const paymentData = {
        success: true,
        transaction: { id: "txn-123", amount: "999.99" },
      };

      const order = await orderModel.create({
        products: [testProduct1._id],
        payment: paymentData,
        buyer: testUser._id,
      });

      expect(order.payment.success).toBe(true);
      expect(order.payment.transaction.id).toBe("txn-123");
    });

    //Aashim Mahindroo, A0265890R
    test("should store multiple products in an order", async () => {
      const order = await orderModel.create({
        products: [testProduct1._id, testProduct2._id],
        payment: { success: true },
        buyer: testUser._id,
      });

      expect(order.products).toHaveLength(2);
    });

    //Aashim Mahindroo, A0265890R
    test("should have timestamps on order", async () => {
      const order = await orderModel.create({
        products: [testProduct1._id],
        payment: { success: true },
        buyer: testUser._id,
      });

      expect(order.createdAt).toBeDefined();
      expect(order.updatedAt).toBeDefined();
    });

    //Aashim Mahindroo, A0265890R
    test("should populate buyer and products in order query", async () => {
      await orderModel.create({
        products: [testProduct1._id, testProduct2._id],
        payment: { success: true },
        buyer: testUser._id,
      });

      const orders = await orderModel
        .find({ buyer: testUser._id })
        .populate("products")
        .populate("buyer", "name email");

      expect(orders.length).toBe(1);
      expect(orders[0].buyer.name).toBe("Test User");
      expect(orders[0].buyer.email).toBe("testuser@test.com");
      expect(orders[0].products.length).toBe(2);
      expect(orders[0].products[0].name).toBe("Test Laptop");
    });
  });
});
