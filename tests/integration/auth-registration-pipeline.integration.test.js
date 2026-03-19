import request from "supertest";
import { createApp } from "../../testUtils/appFactory.js";
import {
  connectTestDB,
  clearTestDB,
  disconnectTestDB,
} from "../../testUtils/dbHandler.js";
import userModel from "../../models/userModel.js";
import { comparePassword } from "../../helpers/authHelper.js";

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
describe("Registration and Password Hashing Pipeline", () => {
  // Priyansh Bimbisariye, A0265903B
  describe("given valid registration details", () => {
    // Priyansh Bimbisariye, A0265903B
    it("should store a bcrypt-hashed password and not leak it in the response", async () => {
      const res = await request(app)
        .post("/api/v1/auth/register")
        .send(validUser);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);

      const dbUser = await userModel.findOne({ email: validUser.email });
      expect(dbUser.password).toMatch(/^\$2b\$/);

      const match = await comparePassword(validUser.password, dbUser.password);
      expect(match).toBe(true);

      expect(res.body.user.password).toBeUndefined();
    });

    // Priyansh Bimbisariye, A0265903B
    it("should allow the stored hash to verify correctly via comparePassword", async () => {
      await request(app).post("/api/v1/auth/register").send(validUser);

      const dbUser = await userModel.findOne({ email: validUser.email });

      const matchCorrect = await comparePassword(
        validUser.password,
        dbUser.password,
      );
      expect(matchCorrect).toBe(true);

      const matchWrong = await comparePassword(
        "wrongpassword",
        dbUser.password,
      );
      expect(matchWrong).toBe(false);
    });
  });

  // Priyansh Bimbisariye, A0265903B
  describe("given a missing required field", () => {
    // Priyansh Bimbisariye, A0265903B
    it("should return 400 when the name field is omitted", async () => {
      const { name, ...userWithoutName } = validUser;

      const res = await request(app)
        .post("/api/v1/auth/register")
        .send(userWithoutName);

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Name is Required");
    });
  });

  // Priyansh Bimbisariye, A0265903B
  describe("given a duplicate email", () => {
    // Priyansh Bimbisariye, A0265903B
    it("should return 409 when registering with an already-used email", async () => {
      await request(app).post("/api/v1/auth/register").send(validUser);

      const res = await request(app)
        .post("/api/v1/auth/register")
        .send(validUser);

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
    });
  });
});
