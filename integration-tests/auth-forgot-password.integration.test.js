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

const registerUser = async () => {
  await request(app).post("/api/v1/auth/register").send(validUser);
};

// Priyansh Bimbisariye, A0265903B
describe("Forgot Password Reset Pipeline", () => {
  // Priyansh Bimbisariye, A0265903B
  describe("given correct email and security answer", () => {
    // Priyansh Bimbisariye, A0265903B
    it("should reset the password and hash the new one in the database", async () => {
      await registerUser();

      const res = await request(app).post("/api/v1/auth/forgot-password").send({
        email: validUser.email,
        answer: validUser.answer,
        newPassword: "newpassword123",
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe("Password Reset Successfully");

      const dbUser = await userModel.findOne({ email: validUser.email });
      const match = await comparePassword("newpassword123", dbUser.password);
      expect(match).toBe(true);

      const oldMatch = await comparePassword(
        validUser.password,
        dbUser.password,
      );
      expect(oldMatch).toBe(false);
    });

    // Priyansh Bimbisariye, A0265903B
    it("should allow login with the new password after reset", async () => {
      await registerUser();

      await request(app).post("/api/v1/auth/forgot-password").send({
        email: validUser.email,
        answer: validUser.answer,
        newPassword: "newpassword123",
      });

      const loginRes = await request(app)
        .post("/api/v1/auth/login")
        .send({ email: validUser.email, password: "newpassword123" });

      expect(loginRes.status).toBe(200);
      expect(loginRes.body.success).toBe(true);
      expect(loginRes.body.token).toBeDefined();
    });
  });

  // Priyansh Bimbisariye, A0265903B
  describe("given an incorrect security answer", () => {
    // Priyansh Bimbisariye, A0265903B
    it("should return 404 and leave the password unchanged", async () => {
      await registerUser();

      const res = await request(app).post("/api/v1/auth/forgot-password").send({
        email: validUser.email,
        answer: "wronganswer",
        newPassword: "newpassword123",
      });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe("Wrong Email Or Answer");

      const dbUser = await userModel.findOne({ email: validUser.email });
      const match = await comparePassword(validUser.password, dbUser.password);
      expect(match).toBe(true);
    });
  });

  // Priyansh Bimbisariye, A0265903B
  describe("given missing required fields", () => {
    // Priyansh Bimbisariye, A0265903B
    it("should return 400 when email is not provided", async () => {
      const res = await request(app)
        .post("/api/v1/auth/forgot-password")
        .send({ answer: "football", newPassword: "newpassword123" });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Email is required");
    });

    // Priyansh Bimbisariye, A0265903B
    it("should return 400 when newPassword is not provided", async () => {
      const res = await request(app)
        .post("/api/v1/auth/forgot-password")
        .send({ email: validUser.email, answer: "football" });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("New Password is required");
    });
  });
});
