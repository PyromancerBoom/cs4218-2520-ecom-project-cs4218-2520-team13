// /**
//  * Seed script: creates test categories, products, and an admin user
//  * in the database so Playwright UI tests have data to work with.
//  *
//  * Usage:  node scripts/seedTestData.js
//  */

// import dotenv from "dotenv";
// import mongoose from "mongoose";
// import slugify from "slugify";
// import bcrypt from "bcrypt";

// dotenv.config();

// // ── Models (inline schemas to avoid import complexity) ───────────────────────

// const categorySchema = new mongoose.Schema({
//   name: { type: String, required: true, unique: true },
//   slug: { type: String, lowercase: true },
// });
// const Category =
//   mongoose.models.Category || mongoose.model("Category", categorySchema);

// const productSchema = new mongoose.Schema(
//   {
//     name: { type: String, required: true },
//     slug: { type: String, required: true },
//     description: { type: String, required: true },
//     price: { type: Number, required: true },
//     category: { type: mongoose.ObjectId, ref: "Category", required: true },
//     quantity: { type: Number, required: true },
//     shipping: { type: Boolean },
//   },
//   { timestamps: true }
// );
// const Product =
//   mongoose.models.Products || mongoose.model("Products", productSchema);

// const userSchema = new mongoose.Schema({
//   name: String,
//   email: { type: String, unique: true },
//   password: String,
//   phone: String,
//   address: String,
//   answer: String,
//   role: { type: Number, default: 0 },
// });
// const User = mongoose.models.users || mongoose.model("users", userSchema);

// // ── Seed Data ─────────────────────────────────────────────────────────────────

// const categories = [
//   { name: "Electronics", slug: "electronics" },
//   { name: "Clothing", slug: "clothing" },
//   { name: "Books", slug: "books" },
// ];

// const products = [
//   {
//     name: "Laptop Pro 15",
//     description:
//       "A high-performance laptop with 16GB RAM and 512GB SSD. Perfect for developers and designers.",
//     price: 1299.99,
//     quantity: 10,
//     shipping: true,
//     categoryName: "Electronics",
//   },
//   {
//     name: "Wireless Headphones",
//     description:
//       "Premium noise-cancelling wireless headphones with 30-hour battery life.",
//     price: 89.99,
//     quantity: 25,
//     shipping: true,
//     categoryName: "Electronics",
//   },
//   {
//     name: "Mechanical Keyboard",
//     description:
//       "Compact TKL mechanical keyboard with Cherry MX switches and RGB lighting.",
//     price: 129.99,
//     quantity: 15,
//     shipping: true,
//     categoryName: "Electronics",
//   },
//   {
//     name: "Cotton T-Shirt",
//     description: "Comfortable 100% cotton t-shirt available in multiple colors.",
//     price: 24.99,
//     quantity: 100,
//     shipping: true,
//     categoryName: "Clothing",
//   },
//   {
//     name: "JavaScript: The Good Parts",
//     description:
//       "A classic programming book covering the best features of JavaScript by Douglas Crockford.",
//     price: 34.99,
//     quantity: 50,
//     shipping: false,
//     categoryName: "Books",
//   },
// ];

// // ── Main ──────────────────────────────────────────────────────────────────────

// async function seed() {
//   await mongoose.connect(process.env.MONGO_URL);
//   console.log("✅ Connected to MongoDB");

//   // Create categories
//   const categoryMap = {};
//   for (const cat of categories) {
//     const existing = await Category.findOne({ slug: cat.slug });
//     if (existing) {
//       categoryMap[cat.name] = existing._id;
//       console.log(`  ⏭  Category already exists: ${cat.name}`);
//     } else {
//       const created = await Category.create(cat);
//       categoryMap[cat.name] = created._id;
//       console.log(`  ➕ Created category: ${cat.name}`);
//     }
//   }

//   // Create products
//   for (const p of products) {
//     const slug = slugify(p.name, { lower: true });
//     const existing = await Product.findOne({ slug });
//     if (existing) {
//       console.log(`  ⏭  Product already exists: ${p.name}`);
//     } else {
//       await Product.create({
//         name: p.name,
//         slug,
//         description: p.description,
//         price: p.price,
//         quantity: p.quantity,
//         shipping: p.shipping,
//         category: categoryMap[p.categoryName],
//       });
//       console.log(`  ➕ Created product: ${p.name} ($${p.price})`);
//     }
//   }

//   // Create admin user
//   const adminEmail = "admin@ecom.com";
//   const existingAdmin = await User.findOne({ email: adminEmail });
//   if (existingAdmin) {
//     console.log(`  ⏭  Admin user already exists: ${adminEmail}`);
//   } else {
//     const hashedPassword = await bcrypt.hash("Admin@1234", 10);
//     await User.create({
//       name: "Admin",
//       email: adminEmail,
//       password: hashedPassword,
//       phone: "1234567890",
//       address: "123 Admin Street",
//       answer: "cricket",
//       role: 1,
//     });
//     console.log(`  ➕ Created admin user: ${adminEmail} / Admin@1234`);
//   }

//   const productCount = await Product.countDocuments();
//   console.log(`\n✅ Seed complete. Total products in DB: ${productCount}`);
//   await mongoose.disconnect();
// }

// seed().catch((err) => {
//   console.error("❌ Seed failed:", err.message);
//   process.exit(1);
// });
