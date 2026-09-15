import express from "express";
import jwt from "jsonwebtoken";

import {
    createOrder,
    getMyOrders,
    getOrderByID,
    deleteOrder,
    getAllOrdersAdmin,
    updateOrderStatusAdmin,
} from "../controllers/orderController.js";

const orderRouter = express.Router();

// ============================================================
// AUTHENTICATION MIDDLEWARE
// ============================================================

const authMiddleware = (req, res, next) => {
    try {
        const authHeader =
            req.headers.authorization;

        if (!authHeader) {
            return res.status(401).json({
                message:
                    "Authentication required. Please login again.",
            });
        }

        if (
            !authHeader.startsWith("Bearer ")
        ) {
            return res.status(401).json({
                message:
                    "Invalid authentication format.",
            });
        }

        const token =
            authHeader.substring(7).trim();

        if (!token) {
            return res.status(401).json({
                message:
                    "Authentication token is missing.",
            });
        }

        if (!process.env.JWT_SECRET) {
            console.error(
                "JWT_SECRET is missing from .env"
            );

            return res.status(500).json({
                message:
                    "Server authentication configuration is missing.",
            });
        }

        const decoded =
            jwt.verify(
                token,
                process.env.JWT_SECRET
            );

        req.user = decoded;

        return next();
    } catch (error) {
        console.error(
            "Order auth middleware error:",
            error
        );

        if (
            error.name ===
            "TokenExpiredError"
        ) {
            return res.status(401).json({
                message:
                    "Your session has expired. Please login again.",
            });
        }

        return res.status(401).json({
            message:
                "Invalid authentication token. Please login again.",
        });
    }
};

// ============================================================
// CREATE ORDER
// POST /api/orders
// ============================================================

orderRouter.post(
    "/",
    authMiddleware,
    createOrder
);

// ============================================================
// GET MY ORDERS
// GET /api/orders/my-orders
// ============================================================

orderRouter.get(
    "/my-orders",
    authMiddleware,
    getMyOrders
);

// ============================================================
// ADMIN - GET ALL ORDERS
// GET /api/orders/admin/all
// ============================================================

orderRouter.get(
    "/admin/all",
    authMiddleware,
    getAllOrdersAdmin
);

// ============================================================
// ADMIN - UPDATE ORDER STATUS
// PUT /api/orders/admin/:orderID/status
// ============================================================

orderRouter.put(
    "/admin/:orderID/status",
    authMiddleware,
    updateOrderStatusAdmin
);

// ============================================================
// GET SINGLE ORDER
// GET /api/orders/:orderID
// ============================================================

orderRouter.get(
    "/:orderID",
    authMiddleware,
    getOrderByID
);

// ============================================================
// DELETE ORDER
// DELETE /api/orders/:orderID
// ============================================================

orderRouter.delete(
    "/:orderID",
    authMiddleware,
    deleteOrder
);

// ============================================================

export default orderRouter;