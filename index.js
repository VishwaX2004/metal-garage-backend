import express from "express";
import mongoose from "mongoose";
import userRouter from "./routes/userRouter.js";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import cors from "cors";
import productRouter from "./routes/productRouter.js";
import orderRouter from "./routes/orderRouter.js";

dotenv.config();

const app = express();

// =============================================================
// MIDDLEWARE
// =============================================================

app.use(express.json());

app.use(cors());

// =============================================================
// JWT AUTHENTICATION MIDDLEWARE
// =============================================================

app.use((req, res, next) => {
    let token = req.header("authorization");

    // If there is no token, continue normally
    if (!token) {
        return next();
    }

    // Remove "Bearer " from authorization header
    if (token.startsWith("Bearer ")) {
        token = token.replace("Bearer ", "");
    }

    // If token is empty
    if (!token) {
        return next();
    }

    // Verify JWT
    jwt.verify(
        token,
        process.env.JWT_SECRET,
        (err, decoded) => {
            if (err || !decoded) {
                return res.status(401).json({
                    message: "Invalid token please login again",
                });
            }

            // Store decoded user information
            req.user = decoded;

            // Continue to the requested route
            return next();
        }
    );
});

// =============================================================
// MONGODB CONNECTION
// =============================================================

const connectionString = process.env.MONGO_URI;

if (!connectionString) {
    console.error("MONGO_URI is not configured in .env");
} else {
    mongoose
        .connect(connectionString)
        .then(() => {
            console.log("Connected to MongoDB");
        })
        .catch((err) => {
            console.log(
                "Error connecting to MongoDB: ",
                err
            );
        });
}

// =============================================================
// ROUTES
// =============================================================

app.use("/api/users", userRouter);

app.use("/api/products", productRouter);

app.use("/api/orders", orderRouter);

// =============================================================
// SERVER
// =============================================================

app.listen(5000, () => {
    console.log("Server is running on port 5000");
});