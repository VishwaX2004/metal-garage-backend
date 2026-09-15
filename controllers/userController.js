import User from "../models/user.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

// ============================================================
// DEFAULT PROFILE IMAGE
// ============================================================

const DEFAULT_PROFILE_IMAGE =
    "https://training.allsoftsolutions.in/images/avtar.png";

// ============================================================
// PUBLIC USER DATA
// Never send password to frontend
// ============================================================

function getPublicUser(user) {
    return {
        id: user._id.toString(),

        _id: user._id.toString(),

        userID: user._id.toString(),

        email: user.email,

        firstName: user.firstName,

        lastName: user.lastName,

        role: user.role,

        isBlock: user.isBlock,

        isEmailVerified:
            user.isEmailVerified,

        profileImage:
            user.profileImage ||
            DEFAULT_PROFILE_IMAGE,
    };
}

// ============================================================
// CREATE JWT TOKEN
// ============================================================

function createUserToken(user) {
    if (!process.env.JWT_SECRET) {
        throw new Error(
            "JWT_SECRET is not configured in the .env file."
        );
    }

    return jwt.sign(
        {
            userID: user._id.toString(),

            email: user.email,

            firstName: user.firstName,

            lastName: user.lastName,

            role: user.role,

            isEmailVerified:
                user.isEmailVerified,
        },

        process.env.JWT_SECRET,

        {
            expiresIn: "7d",
        }
    );
}

// ============================================================
// REGISTER USER
// POST /api/users
// ============================================================

export async function createUser(req, res) {
    try {
        const {
            email,
            firstName,
            lastName,
            password,
        } = req.body;

        // ----------------------------------------------------
        // VALIDATION
        // ----------------------------------------------------

        if (
            !email ||
            !firstName ||
            !lastName ||
            !password
        ) {
            return res.status(400).json({
                message:
                    "Email, first name, last name and password are required.",
            });
        }

        const normalizedEmail =
            String(email)
                .trim()
                .toLowerCase();

        const cleanFirstName =
            String(firstName).trim();

        const cleanLastName =
            String(lastName).trim();

        if (
            !cleanFirstName ||
            !cleanLastName ||
            !normalizedEmail
        ) {
            return res.status(400).json({
                message:
                    "Please provide valid account information.",
            });
        }

        if (String(password).length < 6) {
            return res.status(400).json({
                message:
                    "Password must contain at least 6 characters.",
            });
        }

        // ----------------------------------------------------
        // CHECK EXISTING USER
        // ----------------------------------------------------

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

        // ----------------------------------------------------
        // HASH PASSWORD
        // ----------------------------------------------------

        const hashedPassword =
            await bcrypt.hash(
                String(password),
                10
            );

        // ----------------------------------------------------
        // CREATE USER
        // ----------------------------------------------------

        const user =
            await User.create({
                email: normalizedEmail,

                firstName: cleanFirstName,

                lastName: cleanLastName,

                password: hashedPassword,

                role: "user",

                isBlock: false,

                isEmailVerified: false,

                profileImage:
                    DEFAULT_PROFILE_IMAGE,
            });

        // ----------------------------------------------------
        // RESPONSE
        // ----------------------------------------------------

        return res.status(201).json({
            message:
                "Registration successful.",

            user:
                getPublicUser(user),
        });
    } catch (error) {
        console.error(
            "createUser error:",
            error
        );

        return res.status(500).json({
            message:
                "Something went wrong while creating your account.",
        });
    }
}

// ============================================================
// LOGIN USER
// POST /api/users/login
// ============================================================

export async function loginUser(req, res) {
    try {
        const {
            email,
            password,
        } = req.body;

        // ----------------------------------------------------
        // VALIDATION
        // ----------------------------------------------------

        if (!email || !password) {
            return res.status(400).json({
                message:
                    "Email and password are required.",
            });
        }

        const normalizedEmail =
            String(email)
                .trim()
                .toLowerCase();

        // ----------------------------------------------------
        // CHECK JWT SECRET
        // ----------------------------------------------------

        if (!process.env.JWT_SECRET) {
            console.error(
                "JWT_SECRET is missing from .env"
            );

            return res.status(500).json({
                message:
                    "Server authentication configuration is missing.",
            });
        }

        // ----------------------------------------------------
        // FIND USER
        // ----------------------------------------------------

        const user =
            await User.findOne({
                email: normalizedEmail,
            });

        if (!user) {
            return res.status(401).json({
                message:
                    "Invalid email or password.",
            });
        }

        // ----------------------------------------------------
        // CHECK PASSWORD
        // ----------------------------------------------------

        if (!user.password) {
            console.error(
                "User account has no password:",
                user._id
            );

            return res.status(500).json({
                message:
                    "This account has invalid password data.",
            });
        }

        const passwordMatch =
            await bcrypt.compare(
                String(password),
                user.password
            );

        if (!passwordMatch) {
            return res.status(401).json({
                message:
                    "Invalid email or password.",
            });
        }

        // ----------------------------------------------------
        // CHECK BLOCKED ACCOUNT
        // ----------------------------------------------------

        if (user.isBlock) {
            return res.status(403).json({
                message:
                    "Your account has been blocked. Please contact support.",
            });
        }

        // ----------------------------------------------------
        // CREATE TOKEN
        // ----------------------------------------------------

        const token =
            createUserToken(user);

        // ----------------------------------------------------
        // RESPONSE
        // ----------------------------------------------------

        return res.status(200).json({
            message:
                "Login successful",

            token,

            user:
                getPublicUser(user),
        });
    } catch (error) {
        console.error(
            "loginUser error:",
            error
        );

        return res.status(500).json({
            message:
                "Something went wrong while logging in.",

            error:
                process.env.NODE_ENV === "development"
                    ? error.message
                    : undefined,
        });
    }
}

// ============================================================
// GET CURRENT USER
// GET /api/users/me
// ============================================================

export async function getMyProfile(req, res) {
    try {
        // ----------------------------------------------------
        // CHECK JWT USER
        // ----------------------------------------------------

        if (
            !req.user ||
            !req.user.userID
        ) {
            return res.status(401).json({
                message:
                    "Authentication required. Please login again.",
            });
        }

        // ----------------------------------------------------
        // FIND USER
        // ----------------------------------------------------

        const user =
            await User.findById(
                req.user.userID
            );

        if (!user) {
            return res.status(404).json({
                message:
                    "User account could not be found.",
            });
        }

        // ----------------------------------------------------
        // CHECK BLOCKED ACCOUNT
        // ----------------------------------------------------

        if (user.isBlock) {
            return res.status(403).json({
                message:
                    "Your account has been blocked.",
            });
        }

        // ----------------------------------------------------
        // RESPONSE
        // ----------------------------------------------------

        return res.status(200).json({
            message:
                "Profile loaded successfully.",

            user:
                getPublicUser(user),
        });
    } catch (error) {
        console.error(
            "getMyProfile error:",
            error
        );

        return res.status(500).json({
            message:
                "Something went wrong while loading your profile.",
        });
    }
}

// ============================================================
// UPDATE CURRENT USER
// PUT /api/users/me
// ============================================================

export async function updateMyProfile(req, res) {
    try {
        // ----------------------------------------------------
        // CHECK AUTHENTICATION
        // ----------------------------------------------------

        if (
            !req.user ||
            !req.user.userID
        ) {
            return res.status(401).json({
                message:
                    "Authentication required. Please login again.",
            });
        }

        const userID =
            req.user.userID;

        // ----------------------------------------------------
        // GET DATABASE USER
        // ----------------------------------------------------

        const user =
            await User.findById(
                userID
            );

        if (!user) {
            return res.status(404).json({
                message:
                    "User account could not be found.",
            });
        }

        // ----------------------------------------------------
        // CHECK BLOCKED ACCOUNT
        // ----------------------------------------------------

        if (user.isBlock) {
            return res.status(403).json({
                message:
                    "Your account has been blocked.",
            });
        }

        const {
            firstName,
            lastName,
            email,
            profileImage,
            currentPassword,
            newPassword,
        } = req.body;

        // ====================================================
        // UPDATE FIRST NAME
        // ====================================================

        if (firstName !== undefined) {
            const cleanFirstName =
                String(firstName).trim();

            if (!cleanFirstName) {
                return res.status(400).json({
                    message:
                        "First name cannot be empty.",
                });
            }

            user.firstName =
                cleanFirstName;
        }

        // ====================================================
        // UPDATE LAST NAME
        // ====================================================

        if (lastName !== undefined) {
            const cleanLastName =
                String(lastName).trim();

            if (!cleanLastName) {
                return res.status(400).json({
                    message:
                        "Last name cannot be empty.",
                });
            }

            user.lastName =
                cleanLastName;
        }

        // ====================================================
        // UPDATE EMAIL
        // ====================================================

        if (email !== undefined) {
            const normalizedEmail =
                String(email)
                    .trim()
                    .toLowerCase();

            if (!normalizedEmail) {
                return res.status(400).json({
                    message:
                        "Email cannot be empty.",
                });
            }

            const existingUser =
                await User.findOne({
                    email: normalizedEmail,

                    _id: {
                        $ne: user._id,
                    },
                });

            if (existingUser) {
                return res.status(409).json({
                    message:
                        "This email is already being used by another account.",
                });
            }

            user.email =
                normalizedEmail;
        }

        // ====================================================
        // UPDATE PROFILE IMAGE
        // ====================================================

        if (profileImage !== undefined) {
            if (
                profileImage === null ||
                profileImage === ""
            ) {
                user.profileImage =
                    DEFAULT_PROFILE_IMAGE;
            } else {
                const imageURL =
                    String(profileImage).trim();

                if (
                    !imageURL.startsWith("http://") &&
                    !imageURL.startsWith("https://")
                ) {
                    return res.status(400).json({
                        message:
                            "Invalid profile image URL.",
                    });
                }

                user.profileImage =
                    imageURL;
            }
        }

        // ====================================================
        // UPDATE PASSWORD
        // ====================================================

        if (newPassword !== undefined) {
            const cleanNewPassword =
                String(newPassword);

            if (!currentPassword) {
                return res.status(400).json({
                    message:
                        "Current password is required to change your password.",
                });
            }

            if (cleanNewPassword.length < 6) {
                return res.status(400).json({
                    message:
                        "New password must contain at least 6 characters.",
                });
            }

            const passwordMatch =
                await bcrypt.compare(
                    String(currentPassword),
                    user.password
                );

            if (!passwordMatch) {
                return res.status(401).json({
                    message:
                        "Current password is incorrect.",
                });
            }

            user.password =
                await bcrypt.hash(
                    cleanNewPassword,
                    10
                );
        }

        // ====================================================
        // SAVE
        // ====================================================

        await user.save();

        // ====================================================
        // CREATE NEW JWT
        // ====================================================

        const token =
            createUserToken(user);

        // ====================================================
        // RESPONSE
        // ====================================================

        return res.status(200).json({
            message:
                "Account updated successfully.",

            token,

            user:
                getPublicUser(user),
        });
    } catch (error) {
        console.error(
            "updateMyProfile error:",
            error
        );

        return res.status(500).json({
            message:
                "Something went wrong while updating your account.",
        });
    }
}

// ============================================================
// ADMIN CHECK
// ============================================================

export function isAdmin(req) {
    return (
        req.user &&
        req.user.role === "admin"
    );
}