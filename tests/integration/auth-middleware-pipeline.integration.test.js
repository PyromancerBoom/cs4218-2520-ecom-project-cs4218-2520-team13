import request from "supertest";
import mongoose from "mongoose";
import { createApp } from "../../testUtils/appFactory.js";
import {
  connectTestDB,
  clearTestDB,
  disconnectTestDB,
} from "../../testUtils/dbHandler.js";
import userModel from "../../models/userModel.js";
import productModel from "../../models/productModel.js";

// Priyansh Bimbisariye, A0265903B

let app;

beforeAll(async () => {
  await connectTestDB();
  app = createApp();
});

afterEach(async () => {
  await clearTestDB();
});

afterAll(async () => {
  await disconnectTestDB();
});

const validUser = {
  name: "Test User",
  email: "test@example.com",
  password: "password123",
  phone: "1234567890",
  address: "123 Test St",
  answer: "football",
};

// Priyansh Bimbisariye, A0265903B
// helper function to register and login a user,
// then we bascially return JWT token
const registerAndLogin = async (overrides = {}) => {
  const userData = { ...validUser, ...overrides };
  await request(app).post("/api/v1/auth/register").send(userData);
  const loginRes = await request(app)
    .post("/api/v1/auth/login")
    .send({ email: userData.email, password: userData.password });
  return loginRes.body.token;
};

// Priyansh Bimbisariye, A0265903B
describe("Login, JWT and Auth Middleware Chain", () => {
  // Priyansh Bimbisariye, A0265903B
  describe("given valid credentials", () => {
    // Priyansh Bimbisariye, A0265903B
    it("should return a JWT that grants access to protected routes", async () => {
      const token = await registerAndLogin();

      const res = await request(app)
        .get("/api/v1/auth/user-auth")
        .set("Authorization", token);

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
    });
  });

  // Priyansh Bimbisariye, A0265903B
  describe("given invalid credentials", () => {
    // Priyansh Bimbisariye, A0265903B
    it("should return 401 when the password is incorrect", async () => {
      await request(app).post("/api/v1/auth/register").send(validUser);

      const res = await request(app)
        .post("/api/v1/auth/login")
        .send({ email: validUser.email, password: "wrongpassword" });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  // Priyansh Bimbisariye, A0265903B
  describe("given a missing or invalid token", () => {
    // Priyansh Bimbisariye, A0265903B
    it("should return 401 when no authorization header is provided", async () => {
      const res = await request(app).get("/api/v1/auth/user-auth");

      expect(res.status).toBe(401);
    });

    // Priyansh Bimbisariye, A0265903B
    it("should return 401 when the token is invalid", async () => {
      const res = await request(app)
        .get("/api/v1/auth/user-auth")
        .set("Authorization", "garbage");

      expect(res.status).toBe(401);
    });
  });

  // Priyansh Bimbisariye, A0265903B
  describe("given role-based access control", () => {
    // Priyansh Bimbisariye, A0265903B
    it("should reject a non-admin user from admin-only routes", async () => {
      const token = await registerAndLogin();

      const res = await request(app)
        .get("/api/v1/auth/admin-auth")
        .set("Authorization", token);

      expect(res.status).toBe(401);
    });

    // Priyansh Bimbisariye, A0265903B
    it("should allow an admin user to access admin-only routes", async () => {
      await request(app).post("/api/v1/auth/register").send(validUser);

      await userModel.findOneAndUpdate({ email: validUser.email }, { role: 1 });

      const loginRes = await request(app)
        .post("/api/v1/auth/login")
        .send({ email: validUser.email, password: validUser.password });

      const token = loginRes.body.token;

      const res = await request(app)
        .get("/api/v1/auth/admin-auth")
        .set("Authorization", token);

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
    });
  });

  // Priyansh Bimbisariye, A0265903B
  describe("given an unprotected route that should require auth", () => {
    // Priyansh Bimbisariye, A0265903B
    it("should return 401 when deleting a product without authentication", async () => {
      const categoryId = new mongoose.Types.ObjectId();
      const product = await productModel.create({
        name: "Test Product",
        slug: "test-product",
        description: "A test product",
        price: 10,
        category: categoryId,
        quantity: 5,
      });

      const res = await request(app).delete(
        `/api/v1/product/delete-product/${product._id}`,
      );

      expect(res.status).toBe(401);
    });
  });
});
