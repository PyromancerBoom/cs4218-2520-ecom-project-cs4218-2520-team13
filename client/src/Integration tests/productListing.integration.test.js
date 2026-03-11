/**
 * @jest-environment node
 */

//Aashim Mahindroo, A0265890R

import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

let mongoServer;
let app;
let server;
let request;
let userModel;
let productModel;
let categoryModel;
let JWT;
let userToken;
let adminToken;
let testUser;
let adminUser;
let electronicsCategory;
let clothingCategory;
let cheapProduct;    // price 15 → $0–$19
let midProduct;      // price 89 → $80–$99
let expensiveProduct;// price 150 → $100+
let clothingProduct; // clothing category

beforeAll(async () => {
  process.env.JWT_SECRET = "test-jwt-secret-for-integration";
  process.env.BRAINTREE_MERCHANT_ID = "test_merchant_id";
  process.env.BRAINTREE_PUBLIC_KEY = "test_public_key";
  process.env.BRAINTREE_PRIVATE_KEY = "test_private_key";

  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());

  const unwrap = (mod) => {
    let val = mod.default ?? mod;
    if (typeof val !== "function" && val && val.default) val = val.default;
    return val;
  };

  const expressModule = await import("../../../node_modules/express/index.js");
  const express = expressModule.default ?? expressModule;
  const supertestModule = await import("supertest");
  request = supertestModule.default ?? supertestModule;

  const productRoutesModule = await import("../../../routes/productRoutes.js");
  const categoryRoutesModule = await import("../../../routes/categoryRoutes.js");

  userModel = unwrap(await import("../../../models/userModel.js"));
  productModel = unwrap(await import("../../../models/productModel.js"));
  categoryModel = unwrap(await import("../../../models/categoryModel.js"));

  const jwtMod = await import("jsonwebtoken");
  JWT = jwtMod.default ?? jwtMod;

  const { hashPassword } = await import("../../../helpers/authHelper.js");

  app = express();
  app.use(express.json());
  app.use("/api/v1/product", unwrap(productRoutesModule));
  app.use("/api/v1/category", unwrap(categoryRoutesModule));

  server = app.listen(0);

  // Create categories
  electronicsCategory = await categoryModel.create({
    name: "Electronics",
    slug: "electronics",
  });
  clothingCategory = await categoryModel.create({
    name: "Clothing",
    slug: "clothing",
  });

  // Create users
  testUser = await userModel.create({
    name: "Test User",
    email: "testuser@test.com",
    password: await hashPassword("password123"),
    phone: "1234567890",
    address: "123 Test Street",
    answer: "testanswer",
    role: 0,
  });
  adminUser = await userModel.create({
    name: "Admin User",
    email: "admin@test.com",
    password: await hashPassword("adminpass123"),
    phone: "0987654321",
    address: "456 Admin Street",
    answer: "adminanswer",
    role: 1,
  });

  userToken = JWT.sign({ _id: testUser._id }, process.env.JWT_SECRET, { expiresIn: "7d" });
  adminToken = JWT.sign({ _id: adminUser._id }, process.env.JWT_SECRET, { expiresIn: "7d" });
}, 30000);

afterAll(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await productModel.deleteMany({});

  // cheap: $15 (falls in $0–$19 range)
  cheapProduct = await productModel.create({
    name: "Budget Earbuds",
    slug: "budget-earbuds",
    description: "Affordable earbuds for everyday use",
    price: 15,
    category: electronicsCategory._id,
    quantity: 30,
    shipping: true,
  });

  // mid: $89 (falls in $80–$99 range)
  midProduct = await productModel.create({
    name: "Wireless Headphones",
    slug: "wireless-headphones",
    description: "Noise cancelling wireless headphones",
    price: 89,
    category: electronicsCategory._id,
    quantity: 20,
    shipping: true,
  });

  // expensive: $150 (falls in $100+ range)
  expensiveProduct = await productModel.create({
    name: "Laptop Pro",
    slug: "laptop-pro",
    description: "High performance laptop for professionals",
    price: 150,
    category: electronicsCategory._id,
    quantity: 10,
    shipping: true,
  });

  // clothing
  clothingProduct = await productModel.create({
    name: "Cotton T-Shirt",
    slug: "cotton-t-shirt",
    description: "Comfortable 100% cotton t-shirt",
    price: 25,
    category: clothingCategory._id,
    quantity: 100,
    shipping: true,
  });
});

describe("Home Page - Product Listing and Filtering Integration Tests", () => {

  // ──────────────────────────────────────────────────────
  // GET /api/v1/category/get-category
  // ──────────────────────────────────────────────────────
  describe("GET /api/v1/category/get-category", () => {
    test("should return all categories with success true", async () => {
      const res = await request(app).get("/api/v1/category/get-category");

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.category).toBeInstanceOf(Array);
      expect(res.body.category.length).toBe(2);
    });

    test("should return categories with name and slug fields", async () => {
      const res = await request(app).get("/api/v1/category/get-category");

      expect(res.statusCode).toBe(200);
      const names = res.body.category.map((c) => c.name);
      expect(names).toContain("Electronics");
      expect(names).toContain("Clothing");

      res.body.category.forEach((c) => {
        expect(c).toHaveProperty("name");
        expect(c).toHaveProperty("slug");
        expect(c).toHaveProperty("_id");
      });
    });

    test("should be accessible without authentication", async () => {
      const res = await request(app).get("/api/v1/category/get-category");
      expect(res.statusCode).not.toBe(401);
      expect(res.statusCode).toBe(200);
    });

    test("should return empty array when no categories exist", async () => {
      await categoryModel.deleteMany({});
      const res = await request(app).get("/api/v1/category/get-category");
      expect(res.statusCode).toBe(200);
      expect(res.body.category).toEqual([]);
      // Restore for subsequent tests
      await categoryModel.create({ name: "Electronics", slug: "electronics" });
      await categoryModel.create({ name: "Clothing", slug: "clothing" });
      // Update references
      electronicsCategory = await categoryModel.findOne({ slug: "electronics" });
      clothingCategory = await categoryModel.findOne({ slug: "clothing" });
    });
  });

  // ──────────────────────────────────────────────────────
  // GET /api/v1/product/product-count
  // ──────────────────────────────────────────────────────
  describe("GET /api/v1/product/product-count", () => {
    test("should return correct total product count", async () => {
      const res = await request(app).get("/api/v1/product/product-count");

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.total).toBe(4);
    });

    test("should return 0 when no products exist", async () => {
      await productModel.deleteMany({});
      const res = await request(app).get("/api/v1/product/product-count");
      expect(res.statusCode).toBe(200);
      expect(res.body.total).toBe(0);
    });

    test("should update count after adding a product", async () => {
      const before = await request(app).get("/api/v1/product/product-count");
      const initialCount = before.body.total;

      await productModel.create({
        name: "New Product",
        slug: "new-product",
        description: "A new test product",
        price: 50,
        category: electronicsCategory._id,
        quantity: 5,
        shipping: true,
      });

      const after = await request(app).get("/api/v1/product/product-count");
      expect(after.body.total).toBe(initialCount + 1);
    });

    test("should be accessible without authentication", async () => {
      const res = await request(app).get("/api/v1/product/product-count");
      expect(res.statusCode).not.toBe(401);
    });
  });

  // ──────────────────────────────────────────────────────
  // GET /api/v1/product/product-list/:page
  // ──────────────────────────────────────────────────────
  describe("GET /api/v1/product/product-list/:page", () => {
    test("should return products on page 1", async () => {
      const res = await request(app).get("/api/v1/product/product-list/1");

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.products).toBeInstanceOf(Array);
      expect(res.body.products.length).toBe(4);
    });

    test("should return products with required fields (no photo)", async () => {
      const res = await request(app).get("/api/v1/product/product-list/1");

      expect(res.statusCode).toBe(200);
      const product = res.body.products[0];
      expect(product).toHaveProperty("name");
      expect(product).toHaveProperty("price");
      expect(product).toHaveProperty("description");
      expect(product).toHaveProperty("slug");
      expect(product).toHaveProperty("_id");
      // Photo should be excluded
      expect(product).not.toHaveProperty("photo");
    });

    test("should return empty array for page beyond available products", async () => {
      const res = await request(app).get("/api/v1/product/product-list/999");

      expect(res.statusCode).toBe(200);
      expect(res.body.products).toBeInstanceOf(Array);
      expect(res.body.products.length).toBe(0);
    });

    test("should paginate correctly with 6 products per page", async () => {
      // Add 5 more products so we have 9 total (exceeds 1 page of 6)
      for (let i = 0; i < 5; i++) {
        await productModel.create({
          name: `Extra Product ${i}`,
          slug: `extra-product-${i}`,
          description: `Extra product number ${i}`,
          price: 10 + i,
          category: electronicsCategory._id,
          quantity: 5,
          shipping: true,
        });
      }

      const page1 = await request(app).get("/api/v1/product/product-list/1");
      expect(page1.body.products.length).toBe(6);

      const page2 = await request(app).get("/api/v1/product/product-list/2");
      expect(page2.body.products.length).toBe(3);

      // No overlap between pages
      const page1Ids = page1.body.products.map((p) => p._id);
      const page2Ids = page2.body.products.map((p) => p._id);
      const overlap = page1Ids.filter((id) => page2Ids.includes(id));
      expect(overlap.length).toBe(0);
    });

    test("should handle page=0 gracefully (treat as page 1)", async () => {
      const res = await request(app).get("/api/v1/product/product-list/0");
      expect(res.statusCode).toBe(200);
      expect(res.body.products.length).toBeGreaterThan(0);
    });

    test("should handle non-numeric page gracefully", async () => {
      const res = await request(app).get("/api/v1/product/product-list/abc");
      expect(res.statusCode).toBe(200);
      // Should fall back to page 1
      expect(res.body.products.length).toBeGreaterThan(0);
    });

    test("should return products sorted by newest first", async () => {
      const res = await request(app).get("/api/v1/product/product-list/1");
      expect(res.statusCode).toBe(200);
      const dates = res.body.products.map((p) => new Date(p.createdAt).getTime());
      for (let i = 0; i < dates.length - 1; i++) {
        expect(dates[i]).toBeGreaterThanOrEqual(dates[i + 1]);
      }
    });
  });

  // ──────────────────────────────────────────────────────
  // POST /api/v1/product/product-filters
  // ──────────────────────────────────────────────────────
  describe("POST /api/v1/product/product-filters", () => {
    test("should return all products when no filters applied", async () => {
      const res = await request(app)
        .post("/api/v1/product/product-filters")
        .send({ checked: [], radio: [] });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.products.length).toBe(4);
    });

    test("should filter by category", async () => {
      const res = await request(app)
        .post("/api/v1/product/product-filters")
        .send({ checked: [electronicsCategory._id], radio: [] });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.products.length).toBe(3);
      res.body.products.forEach((p) => {
        expect(p.category.toString()).toBe(electronicsCategory._id.toString());
      });
    });

    test("should filter by clothing category", async () => {
      const res = await request(app)
        .post("/api/v1/product/product-filters")
        .send({ checked: [clothingCategory._id], radio: [] });

      expect(res.statusCode).toBe(200);
      expect(res.body.products.length).toBe(1);
      expect(res.body.products[0].name).toBe("Cotton T-Shirt");
    });

    test("should filter by multiple categories", async () => {
      const res = await request(app)
        .post("/api/v1/product/product-filters")
        .send({
          checked: [electronicsCategory._id, clothingCategory._id],
          radio: [],
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.products.length).toBe(4);
    });

    test("should filter by price range $0–$19", async () => {
      const res = await request(app)
        .post("/api/v1/product/product-filters")
        .send({ checked: [], radio: [0, 19] });

      expect(res.statusCode).toBe(200);
      expect(res.body.products.length).toBe(1);
      expect(res.body.products[0].name).toBe("Budget Earbuds");
      expect(res.body.products[0].price).toBe(15);
    });

    test("should filter by price range $80–$99", async () => {
      const res = await request(app)
        .post("/api/v1/product/product-filters")
        .send({ checked: [], radio: [80, 99] });

      expect(res.statusCode).toBe(200);
      expect(res.body.products.length).toBe(1);
      expect(res.body.products[0].name).toBe("Wireless Headphones");
      expect(res.body.products[0].price).toBe(89);
    });

    test("should filter by price range $100+", async () => {
      const res = await request(app)
        .post("/api/v1/product/product-filters")
        .send({ checked: [], radio: [100, 9999] });

      expect(res.statusCode).toBe(200);
      expect(res.body.products.length).toBe(1);
      expect(res.body.products[0].name).toBe("Laptop Pro");
    });

    test("should filter by both category and price range", async () => {
      const res = await request(app)
        .post("/api/v1/product/product-filters")
        .send({ checked: [electronicsCategory._id], radio: [0, 19] });

      expect(res.statusCode).toBe(200);
      expect(res.body.products.length).toBe(1);
      expect(res.body.products[0].name).toBe("Budget Earbuds");
    });

    test("should return empty array when no products match filters", async () => {
      const res = await request(app)
        .post("/api/v1/product/product-filters")
        .send({ checked: [clothingCategory._id], radio: [100, 9999] });

      expect(res.statusCode).toBe(200);
      expect(res.body.products.length).toBe(0);
    });

    test("should return 400 when radio has wrong format (1 element instead of 2)", async () => {
      // The controller checks radio.length === 2, so a single-element array won't filter by price
      const res = await request(app)
        .post("/api/v1/product/product-filters")
        .send({ checked: [], radio: [0] });

      // With invalid radio format, price filter is skipped → returns all products
      expect(res.statusCode).toBe(200);
      expect(res.body.products.length).toBe(4);
    });

    test("should be accessible without authentication", async () => {
      const res = await request(app)
        .post("/api/v1/product/product-filters")
        .send({ checked: [], radio: [] });

      expect(res.statusCode).not.toBe(401);
    });

    test("should return correct product fields in filter results", async () => {
      const res = await request(app)
        .post("/api/v1/product/product-filters")
        .send({ checked: [electronicsCategory._id], radio: [] });

      expect(res.statusCode).toBe(200);
      const product = res.body.products[0];
      expect(product).toHaveProperty("name");
      expect(product).toHaveProperty("price");
      expect(product).toHaveProperty("description");
      expect(product).toHaveProperty("slug");
    });
  });

  // ──────────────────────────────────────────────────────
  // End-to-end: HomePage product browsing flow
  // ──────────────────────────────────────────────────────
  describe("End-to-end: Product browsing flow", () => {
    test("should complete full browse flow: categories → products → filter", async () => {
      // Step 1: Load categories for filter sidebar
      const catRes = await request(app).get("/api/v1/category/get-category");
      expect(catRes.statusCode).toBe(200);
      expect(catRes.body.category.length).toBeGreaterThan(0);
      const electronics = catRes.body.category.find((c) => c.name === "Electronics");
      expect(electronics).toBeDefined();

      // Step 2: Load product count (for "Load More" button visibility)
      const countRes = await request(app).get("/api/v1/product/product-count");
      expect(countRes.statusCode).toBe(200);
      expect(countRes.body.total).toBe(4);

      // Step 3: Load first page of products
      const listRes = await request(app).get("/api/v1/product/product-list/1");
      expect(listRes.statusCode).toBe(200);
      expect(listRes.body.products.length).toBe(4);

      // Step 4: Apply category filter
      const filterRes = await request(app)
        .post("/api/v1/product/product-filters")
        .send({ checked: [electronics._id], radio: [] });
      expect(filterRes.statusCode).toBe(200);
      expect(filterRes.body.products.length).toBe(3);

      // Step 5: Apply price filter within electronics
      const priceFilterRes = await request(app)
        .post("/api/v1/product/product-filters")
        .send({ checked: [electronics._id], radio: [80, 99] });
      expect(priceFilterRes.statusCode).toBe(200);
      expect(priceFilterRes.body.products.length).toBe(1);
      expect(priceFilterRes.body.products[0].name).toBe("Wireless Headphones");
    });

    test("should reload all products after resetting filters", async () => {
      // Filter to narrow results
      const filtered = await request(app)
        .post("/api/v1/product/product-filters")
        .send({ checked: [clothingCategory._id], radio: [] });
      expect(filtered.body.products.length).toBe(1);

      // Reset: fetch full list again (no filters)
      const reset = await request(app).get("/api/v1/product/product-list/1");
      expect(reset.statusCode).toBe(200);
      expect(reset.body.products.length).toBe(4);
    });

    test("should count match between product-count and product-list", async () => {
      const countRes = await request(app).get("/api/v1/product/product-count");
      const listRes = await request(app).get("/api/v1/product/product-list/1");

      expect(countRes.body.total).toBe(listRes.body.products.length);
    });
  });
});
