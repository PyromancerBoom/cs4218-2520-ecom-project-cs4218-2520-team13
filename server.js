import express from "express";
import colors from "colors";
import dotenv from "dotenv";
import morgan from "morgan";
import connectDB from "./config/db.js";
import authRoutes from './routes/authRoute.js'
import categoryRoutes from './routes/categoryRoutes.js'
import productRoutes from './routes/productRoutes.js'
import cors from "cors";
import { testRouter } from "./tests/loadtest/helper/testDbHelper.js";
import { soakTestRouter } from "./tests/soak/helpers/testDbHelper.js";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import mongoSanitize from "express-mongo-sanitize";

dotenv.config();

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:3000" }));
app.use(express.json());
app.use(mongoSanitize());
app.use(morgan('dev'));

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { success: false, message: "Too many login attempts, try again later." },
    skip: (req) => req.headers['x-loadtest-bypass'] === 'true'
});

app.use("/api/v1/auth/login", loginLimiter);

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/category", categoryRoutes);
app.use("/api/v1/product", productRoutes);
app.use("/api/v1/test", testRouter);
app.use("/api/v1/soak-test", soakTestRouter);

app.get('/', (req, res) => {
    res.send("<h1>Welcome to ecommerce app</h1>");
});

const PORT = process.env.PORT || 6060;

if (process.env.NODE_ENV !== 'test') {
    connectDB();
    app.listen(PORT, () => {
        console.log(`Server running on ${process.env.DEV_MODE} mode on ${PORT}`.bgCyan.white);
    });
}

export default app;