// Priyansh Bimbisariye, A0265903B
const mongoose = require("mongoose");

const E2E_MONGO_URL = "mongodb://localhost:27017/ecommerce_e2e";

// Priyansh Bimbisariye, A0265903B
async function globalTeardown() {
  const conn = await mongoose.connect(E2E_MONGO_URL);
  await conn.connection.db.dropDatabase();
  await mongoose.disconnect();
}

module.exports = globalTeardown;
