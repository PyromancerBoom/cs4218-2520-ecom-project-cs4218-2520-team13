// A0338250J LOU, YING-WEN
import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import app from "../../server.js";
import categoryModel from "../../models/categoryModel.js";

let mongoServer;

describe("Category Integration Tests", () => {


    beforeAll(async () => {
        consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => { });

        if (mongoose.connection.readyState !== 0) {
            await mongoose.disconnect();
        }
        mongoServer = await MongoMemoryServer.create();
        const uri = mongoServer.getUri();
        await mongoose.connect(uri);

    });




    afterAll(async () => {
        await mongoose.disconnect();
        await mongoServer.stop();
        consoleSpy.mockRestore();
        if (app && app.listen) {
            const server = app.listen();
            server.close();
        }
    });


    beforeEach(async () => {
        await categoryModel.deleteMany({});
        await categoryModel.create([
            { name: "Electronics", slug: "electronics" },
            { name: "Home Appliances", slug: "home-appliances" }
        ]);
    });

    // A0338250J LOU, YING-WEN
    test("GET /api/v1/category/get-category - should verify interaction between route, controller and model", async () => {
        const res = await request(app).get("/api/v1/category/get-category");

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.message).toBe("All Categories List");
        expect(res.body.category).toHaveLength(2);

        expect(res.body.category).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ name: "Electronics", slug: "electronics" }),
                expect.objectContaining({ name: "Home Appliances", slug: "home-appliances" })
            ])
        );
    });

    // A0338250J LOU, YING-WEN
    test("GET /api/v1/category/single-category/:slug - should verify singleCategoryController retrieval", async () => {
        const res = await request(app).get("/api/v1/category/single-category/home-appliances");

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.category.name).toBe("Home Appliances");
        expect(res.body.category.slug).toBe("home-appliances");
    });

    // A0338250J LOU, YING-WEN
    test("GET /api/v1/category/single-category/:slug - should return null for missing data to verify controller logic", async () => {
        const res = await request(app).get("/api/v1/category/single-category/none");

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.category).toBeNull();
    });

    // A0338250J LOU, YING-WEN
    test("GET /api/v1/category/get-category - should verify error handling in catch block", async () => {
        jest.spyOn(categoryModel, 'find').mockRejectedValueOnce(new Error("Database Failure"));

        const res = await request(app).get("/api/v1/category/get-category");

        expect(res.status).toBe(500);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toBe("Error while getting all categories");

        categoryModel.find.mockRestore();
    });
});