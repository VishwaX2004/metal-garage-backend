import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";

import userRouter from "./routes/userRouter.js";
import productRouter from "./routes/productRouter.js";
import orderRouter from "./routes/orderRouter.js";
import payhereRouter from "./routes/payhereRoutes.js";

dotenv.config();

const app = express();

/* =============================================================
   MIDDLEWARE
============================================================= */

app.use(
    cors({
        origin: true,
        credentials: true,
    })
);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

/* =============================================================
   MONGODB CONNECTION
============================================================= */

const connectionString =
    process.env.MONGO_URI;

if (!connectionString) {
    console.error(
        "MONGO_URI is not configured in .env"
    );
} else {
    mongoose
        .connect(connectionString)
        .then(() => {
            console.log(
                "Connected to MongoDB"
            );
        })
        .catch((error) => {
            console.error(
                "Error connecting to MongoDB:",
                error
            );
        });
}

/* =============================================================
   ROUTES
============================================================= */

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

app.use(
    "/api/payments/payhere",
    payhereRouter
);

/* =============================================================
   HEALTH CHECK
============================================================= */

app.get(
    "/",
    (req, res) => {
        res.json({
            message:
                "Metal Garage API is running",
        });
    }
);

/* =============================================================
   SERVER
============================================================= */

const PORT =
    process.env.PORT || 5000;

app.listen(
    PORT,
    () => {
        console.log(
            `Server is running on port ${PORT}`
        );
    }
);