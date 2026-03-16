import request from "supertest";
import { createApp } from "../testUtils/appFactory.js";
import {
  connectTestDB,
  clearTestDB,
  disconnectTestDB,
} from "../testUtils/dbHandler.js";
import userModel from "../models/userModel.js";
import { comparePassword } from "../helpers/authHelper.js";

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
// helper for login, register and token in one step
const registerAndLogin = async () => {
  await request(app).post("/api/v1/auth/register").send(validUser);
  const loginRes = await request(app)
    .post("/api/v1/auth/login")
    .send({ email: validUser.email, password: validUser.password });
  return loginRes.body.token;
};

// Priyansh Bimbisariye, A0265903B
describe("Profile Update through Auth Pipeline", () => {
  // Priyansh Bimbisariye, A0265903B
  describe("given valid profile updates", () => {
    // Priyansh Bimbisariye, A0265903B
    it("should update name, phone, address, and password in the database", async () => {
      const token = await registerAndLogin();

      const res = await request(app)
        .put("/api/v1/auth/profile")
        .set("Authorization", token)
        .send({
          name: "Updated Name",
          phone: "9999999999",
          address: "456 New St",
          password: "newpassword",
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const dbUser = await userModel.findOne({ email: validUser.email });
      expect(dbUser.name).toBe("Updated Name");
      expect(dbUser.phone).toBe("9999999999");
      expect(dbUser.address).toBe("456 New St");

      const match = await comparePassword("newpassword", dbUser.password);
      expect(match).toBe(true);
    });

    // Priyansh Bimbisariye, A0265903B
    // test email separately because it has unique constraint
    it("should not persist the email change even when a new email is provided", async () => {
      const token = await registerAndLogin();

      const res = await request(app)
        .put("/api/v1/auth/profile")
        .set("Authorization", token)
        .send({
          name: "Updated Name",
          email: "newemail@example.com",
        });

      expect(res.status).toBe(200);

      const dbUser = await userModel.findOne({
        email: "newemail@example.com",
      });
      expect(dbUser).toBeNull();
    });
  });

  // Priyansh Bimbisariye, A0265903B
  describe("given password boundary values", () => {
    // Priyansh Bimbisariye, A0265903B
    it("should reject a password shorter than 6 characters", async () => {
      const token = await registerAndLogin();

      const res = await request(app)
        .put("/api/v1/auth/profile")
        .set("Authorization", token)
        .send({ password: "12345" });

      expect(res.body.error).toBeDefined();

      const dbUser = await userModel.findOne({ email: validUser.email });
      const match = await comparePassword(validUser.password, dbUser.password);
      expect(match).toBe(true);
    });

    // Priyansh Bimbisariye, A0265903B
    it("should accept a password that is exactly 6 characters", async () => {
      const token = await registerAndLogin();

      const res = await request(app)
        .put("/api/v1/auth/profile")
        .set("Authorization", token)
        .send({ password: "123456" });

      expect(res.status).toBe(200);

      const dbUser = await userModel.findOne({ email: validUser.email });
      const match = await comparePassword("123456", dbUser.password);
      expect(match).toBe(true);
    });
  });

  // Priyansh Bimbisariye, A0265903B
  describe("given no authentication", () => {
    // Priyansh Bimbisariye, A0265903B
    it("should return 401 when no auth token is provided", async () => {
      const res = await request(app)
        .put("/api/v1/auth/profile")
        .send({ name: "No Auth" });

      expect(res.status).toBe(401);
    });
  });
});
