import express from "express";
import jwt from "jsonwebtoken";

import {
    createUser,
    loginUser,
    getMyProfile,
    updateMyProfile,

    // ADMIN
    adminOnly,
    getAllUsersAdmin,
    getUserAdmin,
    createUserAdmin,
    updateUserAdmin,
    deleteUserAdmin,
} from "../controllers/userController.js";

const userRouter = express.Router();

/* ============================================================
   AUTHENTICATION MIDDLEWARE
============================================================ */

export const authMiddleware = (req, res, next) => {
    try {
        const authHeader =
            req.headers.authorization;

        /* ----------------------------------------------------
           CHECK AUTH HEADER
        ---------------------------------------------------- */

        if (!authHeader) {
            return res.status(401).json({
                message:
                    "Authentication required. Please login again.",
            });
        }

        /* ----------------------------------------------------
           CHECK BEARER FORMAT
        ---------------------------------------------------- */

        if (
            !authHeader.startsWith(
                "Bearer "
            )
        ) {
            return res.status(401).json({
                message:
                    "Invalid authentication format.",
            });
        }

        /* ----------------------------------------------------
           GET TOKEN
        ---------------------------------------------------- */

        const token =
            authHeader
                .substring(7)
                .trim();

        if (!token) {
            return res.status(401).json({
                message:
                    "Authentication token is missing.",
            });
        }

        /* ----------------------------------------------------
           JWT SECRET
        ---------------------------------------------------- */

        if (!process.env.JWT_SECRET) {
            console.error(
                "JWT_SECRET is missing from environment variables."
            );

            return res.status(500).json({
                message:
                    "Server authentication configuration is missing.",
            });
        }

        /* ----------------------------------------------------
           VERIFY JWT
        ---------------------------------------------------- */

        const decoded =
            jwt.verify(
                token,
                process.env.JWT_SECRET
            );

        req.user = decoded;

        return next();
    } catch (error) {
        console.error(
            "authMiddleware error:",
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

        if (
            error.name ===
            "JsonWebTokenError"
        ) {
            return res.status(401).json({
                message:
                    "Invalid authentication token. Please login again.",
            });
        }

        return res.status(401).json({
            message:
                "Invalid authentication token. Please login again.",
        });
    }
};

/* ============================================================
   PUBLIC ROUTES
============================================================ */

// REGISTER
// POST /api/users

userRouter.post(
    "/",
    createUser
);

// LOGIN
// POST /api/users/login

userRouter.post(
    "/login",
    loginUser
);

/* ============================================================
   ADMIN CRUD ROUTES

   ALL ADMIN ROUTES REQUIRE:

   1. Valid JWT
   2. role === "admin"
============================================================ */

// GET ALL USERS
// GET /api/users/admin

userRouter.get(
    "/admin",
    authMiddleware,
    adminOnly,
    getAllUsersAdmin
);

// GET ONE USER
// GET /api/users/admin/:id

userRouter.get(
    "/admin/:id",
    authMiddleware,
    adminOnly,
    getUserAdmin
);

// CREATE USER
// POST /api/users/admin

userRouter.post(
    "/admin",
    authMiddleware,
    adminOnly,
    createUserAdmin
);

// UPDATE USER
// PUT /api/users/admin/:id

userRouter.put(
    "/admin/:id",
    authMiddleware,
    adminOnly,
    updateUserAdmin
);

// DELETE USER
// DELETE /api/users/admin/:id

userRouter.delete(
    "/admin/:id",
    authMiddleware,
    adminOnly,
    deleteUserAdmin
);

/* ============================================================
   CURRENT USER ROUTES
============================================================ */

// GET CURRENT USER
// GET /api/users/me

userRouter.get(
    "/me",
    authMiddleware,
    getMyProfile
);

// UPDATE CURRENT USER
// PUT /api/users/me

userRouter.put(
    "/me",
    authMiddleware,
    updateMyProfile
);

/* ============================================================ */

export default userRouter;