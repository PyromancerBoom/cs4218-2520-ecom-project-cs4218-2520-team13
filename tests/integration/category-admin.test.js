import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import app from "../../server.js";
import categoryModel from "../../models/categoryModel.js";
import userModel from "../../models/userModel.js";
import JWT from "jsonwebtoken";

// Ensure JWT_SECRET is available for testing
process.env.JWT_SECRET = process.env.JWT_SECRET || "test_secret_key";

let mongoServer;
let adminToken;
let adminId;


beforeAll(async () => {
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => { });
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();

    if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
    }
    await mongoose.connect(uri);

    adminId = new mongoose.Types.ObjectId();
    const adminUser = new userModel({
        _id: adminId,
        name: "Admin User",
        email: "admin@test.com",
        password: "hashedpassword",
        phone: "123456",
        address: "Admin House",
        answer: "test-answer",
        role: 1,
    });
    await adminUser.save();

    adminToken = JWT.sign({ _id: adminId }, process.env.JWT_SECRET, { expiresIn: "7d" });
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
    consoleSpy.mockRestore();
});

beforeEach(async () => {
    await categoryModel.deleteMany({});
});

describe("Admin Category CRUD Integration Tests", () => {

    describe("POST /api/v1/category/create-category", () => {
        // A0338250J LOU, YING-WEN
        it("should create a new category when user is admin", async () => {
            const res = await request(app)
                .post("/api/v1/category/create-category")
                .set("Authorization", adminToken)
                .send({ name: "Electronics" });

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.category.name).toBe("Electronics");
            expect(res.body.category.slug).toBe("electronics");
        });

        // A0338250J LOU, YING-WEN
        it("should reject duplicate category names", async () => {
            await new categoryModel({ name: "Books", slug: "books" }).save();

            const res = await request(app)
                .post("/api/v1/category/create-category")
                .set("Authorization", adminToken)
                .send({ name: "Books" });

            expect(res.status).toBe(200);
            expect(res.body.message).toBe("Category Already Exists");
        });

        // A0338250J LOU, YING-WEN
        it("should return 401 if name is empty", async () => {
            const res = await request(app)
                .post("/api/v1/category/create-category")
                .set("Authorization", adminToken)
                .send({ name: "" });

            expect(res.status).toBe(401);
            expect(res.body.message).toBe("Name is required");
        });
    });

    describe("PUT /api/v1/category/update-category/:id", () => {
        // A0338250J LOU, YING-WEN
        it("should update an existing category", async () => {
            const category = await new categoryModel({ name: "Old Name", slug: "old-name" }).save();

            const res = await request(app)
                .put(`/api/v1/category/update-category/${category._id}`)
                .set("Authorization", adminToken)
                .send({ name: "New Name" });

            expect(res.status).toBe(200);
            expect(res.body.category.name).toBe("New Name");
            expect(res.body.category.slug).toBe("new-name");
        });

        // A0338250J LOU, YING-WEN
        it("should return 404 if category id does not exist", async () => {
            const fakeId = new mongoose.Types.ObjectId();
            const res = await request(app)
                .put(`/api/v1/category/update-category/${fakeId}`)
                .set("Authorization", adminToken)
                .send({ name: "Nowhere" });

            expect(res.status).toBe(404);
            expect(res.body.message).toBe("Category not found");
        });
    });

    describe("DELETE /api/v1/category/delete-category/:id", () => {
        // A0338250J LOU, YING-WEN
        it("should delete a category by id", async () => {
            const category = await new categoryModel({ name: "To Be Deleted", slug: "del" }).save();

            const res = await request(app)
                .delete(`/api/v1/category/delete-category/${category._id}`)
                .set("Authorization", adminToken);

            expect(res.status).toBe(200);
            expect(res.body.message).toBe("Category Deleted Successfully");

            const findItem = await categoryModel.findById(category._id);
            expect(findItem).toBeNull();
        });

        // A0338250J LOU, YING-WEN
        it("should return 400 for invalid ObjectId format", async () => {
            const res = await request(app)
                .delete("/api/v1/category/delete-category/123-invalid-id")
                .set("Authorization", adminToken);

            expect(res.status).toBe(400);
            expect(res.body.message).toBe("Invalid category ID format");
        });
    });

    describe("Admin Authorization", () => {
        // A0338250J LOU, YING-WEN
        it("should return 401 if no token is provided", async () => {
            const res = await request(app)
                .post("/api/v1/category/create-category")
                .send({ name: "No Token" });

            expect(res.status).toBe(401);
            expect(res.body.message).toBe("Unauthorized");
        });

        // A0338250J LOU, YING-WEN
        it("should return 401 if user is not an admin (role: 0)", async () => {
            const userId = new mongoose.Types.ObjectId();
            await new userModel({
                _id: userId,
                name: "Normal User",
                email: "user@test.com",
                password: "password",
                phone: "000",
                address: "User Street",
                answer: "my_secret_answer",
                role: 0,
            }).save();

            const userToken = JWT.sign({ _id: userId }, process.env.JWT_SECRET);

            const res = await request(app)
                .post("/api/v1/category/create-category")
                .set("Authorization", userToken)
                .send({ name: "Attempt" });

            expect(res.status).toBe(401);
            expect(res.body.message).toBe("UnAuthorized Access");
        });
    });
});