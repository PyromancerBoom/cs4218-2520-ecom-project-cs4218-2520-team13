// Priyansh Bimbisariye, A0265903B
const mongoose = require("mongoose");
const slugify = require("slugify");
const bcrypt = require("bcrypt");
const fs = require("fs");
const path = require("path");
const E2E_MONGO_URL = "mongodb://localhost:27017/ecommerce_e2e";

// Priyansh Bimbisariye, A0265903B
async function globalSetup() {
  const conn = await mongoose.connect(E2E_MONGO_URL);
  const db = conn.connection.db;

  // seed admin user
  const existingAdmin = await db
    .collection("users")
    .findOne({ email: "admin@admin.com" });
  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash("admin", 10);
    await db.collection("users").insertOne({
      name: "Admin",
      email: "admin@admin.com",
      password: hashedPassword,
      phone: "0000000000",
      address: "Test Address",
      answer: "test",
      role: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  // seed test category
  let category = await db
    .collection("categories")
    .findOne({ name: "Test Category" });
  if (!category) {
    const result = await db.collection("categories").insertOne({
      name: "Test Category",
      slug: slugify("Test Category"),
    });
    category = { _id: result.insertedId };
  }

  // seed test product
  const imgBuffer = fs.readFileSync(
    path.join(__dirname, "..", "test_assets", "test-image.jpg"),
  );
  await db.collection("products").deleteOne({ name: "Seeded Test Product" });
  await db.collection("products").insertOne({
    name: "Seeded Test Product",
    slug: slugify("Seeded Test Product"),
    description: "A seeded product for E2E testing",
    price: 100,
    category: category._id,
    quantity: 10,
    photo: { data: imgBuffer, contentType: "image/jpeg" },
    shipping: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  await mongoose.disconnect();
}

module.exports = globalSetup;
