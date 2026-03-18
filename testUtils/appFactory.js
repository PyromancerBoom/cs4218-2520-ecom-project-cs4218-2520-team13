import express from "express";
import cors from "cors";
import authRoutes from "../routes/authRoute.js";
import categoryRoutes from "../routes/categoryRoutes.js";
import productRoutes from "../routes/productRoutes.js";

// Used by multiple integration tests to create a
// fresh app instance with all routes/middlewares for each test suite

// Priyansh Bimbisariye, A0265903B
export const createApp = () => {
  process.env.JWT_SECRET = "test-jwt-secret";

  const app = express();

  // middlewares
  app.use(cors());
  app.use(express.json());

  // routes
  app.use("/api/v1/auth", authRoutes);
  app.use("/api/v1/category", categoryRoutes);
  app.use("/api/v1/product", productRoutes);

  return app;
};
