import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";

import userRouter from "./routes/userRouter.js";
import productRouter from "./routes/productRouter.js";
import orderRouter from "./routes/orderRouter.js";
import payhereRouter from "./routes/payhereRoutes.js";

// =============================================================
// LOAD ENVIRONMENT VARIABLES
// =============================================================

dotenv.config();

const app = express();

// =============================================================
// BASIC APP SETTINGS
// =============================================================

app.set("trust proxy", 1);

// =============================================================
// CORS
// =============================================================

app.use(
    cors({
        origin: true,
        credentials: true,
        methods: [
            "GET",
            "POST",
            "PUT",
            "PATCH",
            "DELETE",
            "OPTIONS",
        ],
        allowedHeaders: [
            "Content-Type",
            "Authorization",
        ],
    })
);

// =============================================================
// BODY PARSERS
// =============================================================

// JSON requests
app.use(express.json());

// PayHere sends application/x-www-form-urlencoded data
app.use(
    express.urlencoded({
        extended: true,
    })
);

// =============================================================
// MONGODB CONNECTION
// =============================================================

const connectionString = process.env.MONGO_URI;

if (!connectionString) {
    console.error(
        "❌ MONGO_URI is not configured in environment variables."
    );
} else {
    mongoose
        .connect(connectionString)
        .then(() => {
            console.log("✅ Connected to MongoDB");
        })
        .catch((error) => {
            console.error(
                "❌ Error connecting to MongoDB:",
                error.message
            );
        });
}

// =============================================================
// API ROUTES
// =============================================================

app.use(
    "/api/users",
    userRouter
);

app.use(
    "/api/products",
    productRouter
);

app.use(
    "/api/orders",
    orderRouter
);

// PayHere
app.use(
    "/api/payments/payhere",
    payhereRouter
);

// =============================================================
// HEALTH CHECK
// =============================================================

app.get("/", (req, res) => {
    res.status(200).json({
        success: true,
        message: "Metal Garage API is running",
    });
});

// =============================================================
// PAYHERE HEALTH CHECK
// =============================================================

app.get(
    "/api/payments/payhere",
    (req, res) => {
        res.status(200).json({
            success: true,
            message: "PayHere API is running",
        });
    }
);

// =============================================================
// 404 HANDLER
// =============================================================

app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: `Route not found: ${req.method} ${req.originalUrl}`,
    });
});

// =============================================================
// GLOBAL ERROR HANDLER
// =============================================================

app.use((error, req, res, next) => {
    console.error("❌ Server Error:", error);

    res.status(error.status || 500).json({
        success: false,
        message:
            error.message ||
            "Internal server error",
    });
});

// =============================================================
// SERVER
// =============================================================

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(
        `🚀 Server is running on port ${PORT}`
    );

    console.log(
        `🌐 API: http://localhost:${PORT}`
    );

    console.log(
        `💳 PayHere: /api/payments/payhere`
    );
});