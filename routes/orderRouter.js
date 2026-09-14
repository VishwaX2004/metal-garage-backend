import express from "express";
import jwt from "jsonwebtoken";

import {
    createOrder,
    getMyOrders,
    getOrderByID,
    deleteOrder,
} from "../controllers/orderController.js";

const orderRouter = express.Router();

// =============================================================
// AUTHENTICATION MIDDLEWARE
// =============================================================

const requireAuth = (req, res, next) => {
    try {
        const authorization =
            req.headers.authorization;

        if (!authorization) {
            return res.status(401).json({
                message:
                    "Authentication required.",
            });
        }

        if (
            !authorization.startsWith("Bearer ")
        ) {
            return res.status(401).json({
                message:
                    "Invalid authentication format.",
            });
        }

        const token =
            authorization.split(" ")[1];

        if (!token) {
            return res.status(401).json({
                message:
                    "Authentication token is missing.",
            });
        }

        const secret =
            process.env.JWT_SECRET;

        if (!secret) {
            console.error(
                "JWT_SECRET is not configured."
            );

            return res.status(500).json({
                message:
                    "Server authentication is not configured.",
            });
        }

        const decoded =
            jwt.verify(token, secret);

        req.user = decoded;

        next();
    } catch (error) {
        console.error(
            "Authentication error:",
            error.message
        );

        return res.status(401).json({
            message:
                "Invalid or expired authentication token.",
        });
    }
};

// =============================================================
// CREATE ORDER
// POST /api/orders
// =============================================================

orderRouter.post(
    "/",
    requireAuth,
    createOrder
);

// =============================================================
// GET USER ORDERS
// GET /api/orders/my-orders
// =============================================================

orderRouter.get(
    "/my-orders",
    requireAuth,
    getMyOrders
);

// =============================================================
// DELETE ORDER
// DELETE /api/orders/:orderID
// =============================================================

orderRouter.delete(
    "/:orderID",
    requireAuth,
    deleteOrder
);

// =============================================================
// GET SINGLE ORDER
// GET /api/orders/:orderID
// =============================================================

orderRouter.get(
    "/:orderID",
    requireAuth,
    getOrderByID
);

export default orderRouter;

