import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

// Utility functions to manage an in-memory MongoDB instance for testing purposes

// Priyansh Bimbisariye, A0265903B
let mongoServer;

// Priyansh Bimbisariye, A0265903B
export const connectTestDB = async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
};

// Priyansh Bimbisariye, A0265903B
export const clearTestDB = async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
};

// Priyansh Bimbisariye, A0265903B
export const disconnectTestDB = async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  await mongoServer.stop();
};
