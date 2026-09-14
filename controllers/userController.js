import User from "../models/user.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";


/* =========================================================
   CREATE USER
========================================================= */

export async function createUser(req, res) {
    try {
        const {
            email,
            firstName,
            lastName,
            password,
            role,
        } = req.body;

        if (!email || !firstName || !lastName || !password) {
            return res.status(400).json({
                message:
                    "Email, first name, last name and password are required.",
            });
        }

        const normalizedEmail =
            email.trim().toLowerCase();

        const existingUser =
            await User.findOne({
                email: normalizedEmail,
            });

        if (existingUser) {
            return res.status(409).json({
                message:
                    "An account with this email already exists.",
            });
        }

        const hashedPassword =
            await bcrypt.hash(password, 10);

        const user = new User({
            email: normalizedEmail,
            firstName:
                firstName.trim(),
            lastName:
                lastName.trim(),
            password:
                hashedPassword,
            role:
                role || "user",
        });

        await user.save();

        return res.status(201).json({
            message:
                "User saved successfully",
        });

    } catch (error) {
        console.error(
            "Create user error:",
            error
        );

        return res.status(500).json({
            message:
                "Error saving user.",
            error:
                error.message,
        });
    }
}


/* =========================================================
   LOGIN USER
========================================================= */

export async function loginUser(req, res) {
    try {
        const {
            email,
            password,
        } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                message:
                    "Email and password are required.",
            });
        }

        const normalizedEmail =
            email.trim().toLowerCase();

        const user =
            await User.findOne({
                email: normalizedEmail,
            });

        if (!user) {
            return res.status(404).json({
                message:
                    "User not found.",
            });
        }

        const isPasswordMatching =
            await bcrypt.compare(
                password,
                user.password
            );

        if (!isPasswordMatching) {
            return res.status(401).json({
                message:
                    "Invalid password.",
            });
        }


        /* =====================================================
           JWT
        ===================================================== */

        const token =
            jwt.sign(
                {
                    userID:
                        user._id.toString(),

                    email:
                        user.email,

                    firstName:
                        user.firstName,

                    lastName:
                        user.lastName,

                    role:
                        user.role,

                    isEmailVerified:
                        user.isEmailVerified,
                },
                process.env.JWT_SECRET,
                {
                    expiresIn:
                        "7d",
                }
            );


        /* =====================================================
           RESPONSE
        ===================================================== */

        return res.status(200).json({
            message:
                "Login successful",

            token,

            user: {
                id:
                    user._id.toString(),

                _id:
                    user._id.toString(),

                userID:
                    user._id.toString(),

                email:
                    user.email,

                firstName:
                    user.firstName,

                lastName:
                    user.lastName,

                role:
                    user.role,

                isEmailVerified:
                    user.isEmailVerified,
            },
        });

    } catch (error) {
        console.error(
            "Login error:",
            error
        );

        return res.status(500).json({
            message:
                "Login failed.",
            error:
                error.message,
        });
    }
}


/* =========================================================
   ADMIN CHECK
========================================================= */

export function isAdmin(req) {
    if (!req.user) {
        return false;
    }

    if (req.user.role !== "admin") {
        return false;
    }

    return true;
}

