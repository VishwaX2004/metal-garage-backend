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
// NEVER SEND PASSWORD
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

        createdAt: user.createdAt,

        updatedAt: user.updatedAt,
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
            await bcrypt.hash(
                String(password),
                10
            );

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

        if (!process.env.JWT_SECRET) {
            console.error(
                "JWT_SECRET is missing from .env"
            );

            return res.status(500).json({
                message:
                    "Server authentication configuration is missing.",
            });
        }

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

        if (!user.password) {
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

        if (user.isBlock) {
            return res.status(403).json({
                message:
                    "Your account has been blocked. Please contact support.",
            });
        }

        const token =
            createUserToken(user);

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
        });
    }
}

// ============================================================
// GET CURRENT USER
// GET /api/users/me
// ============================================================

export async function getMyProfile(req, res) {
    try {
        if (
            !req.user ||
            !req.user.userID
        ) {
            return res.status(401).json({
                message:
                    "Authentication required. Please login again.",
            });
        }

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

        if (user.isBlock) {
            return res.status(403).json({
                message:
                    "Your account has been blocked.",
            });
        }

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
                    !imageURL.startsWith(
                        "http://"
                    ) &&
                    !imageURL.startsWith(
                        "https://"
                    )
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

        await user.save();

        const token =
            createUserToken(user);

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

// ============================================================
// ADMIN AUTH MIDDLEWARE
// ============================================================

export function adminOnly(req, res, next) {
    if (
        !req.user ||
        req.user.role !== "admin"
    ) {
        return res.status(403).json({
            message:
                "Admin access is required.",
        });
    }

    return next();
}

// ============================================================
// ADMIN - GET ALL USERS
// GET /api/users/admin
// ============================================================

export async function getAllUsersAdmin(
    req,
    res
) {
    try {
        const users =
            await User.find({})
                .select(
                    "-password"
                )
                .sort({
                    createdAt: -1,
                });

        return res.status(200).json({
            message:
                "Users loaded successfully.",

            users:
                users.map(
                    getPublicUser
                ),
        });
    } catch (error) {
        console.error(
            "getAllUsersAdmin error:",
            error
        );

        return res.status(500).json({
            message:
                "Something went wrong while loading users.",
        });
    }
}

// ============================================================
// ADMIN - GET ONE USER
// GET /api/users/admin/:id
// ============================================================

export async function getUserAdmin(
    req,
    res
) {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({
                message:
                    "User ID is required.",
            });
        }

        const user =
            await User.findById(id);

        if (!user) {
            return res.status(404).json({
                message:
                    "User could not be found.",
            });
        }

        return res.status(200).json({
            message:
                "User loaded successfully.",

            user:
                getPublicUser(user),
        });
    } catch (error) {
        console.error(
            "getUserAdmin error:",
            error
        );

        return res.status(500).json({
            message:
                "Something went wrong while loading the user.",
        });
    }
}

// ============================================================
// ADMIN - CREATE USER
// POST /api/users/admin
// ============================================================

export async function createUserAdmin(
    req,
    res
) {
    try {
        const {
            email,
            firstName,
            lastName,
            password,
            role,
            isBlock,
            isEmailVerified,
            profileImage,
        } = req.body;

        if (
            !email ||
            !firstName ||
            !lastName ||
            !password
        ) {
            return res.status(400).json({
                message:
                    "First name, last name, email and password are required.",
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

        const cleanPassword =
            String(password);

        if (
            !normalizedEmail ||
            !cleanFirstName ||
            !cleanLastName
        ) {
            return res.status(400).json({
                message:
                    "Please provide valid user information.",
            });
        }

        if (cleanPassword.length < 6) {
            return res.status(400).json({
                message:
                    "Password must contain at least 6 characters.",
            });
        }

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
            await bcrypt.hash(
                cleanPassword,
                10
            );

        const safeRole =
            role === "admin"
                ? "admin"
                : "user";

        const image =
            profileImage &&
            String(profileImage).trim()
                ? String(
                      profileImage
                  ).trim()
                : DEFAULT_PROFILE_IMAGE;

        if (
            !image.startsWith(
                "http://"
            ) &&
            !image.startsWith(
                "https://"
            )
        ) {
            return res.status(400).json({
                message:
                    "Invalid profile image URL.",
            });
        }

        const user =
            await User.create({
                email: normalizedEmail,

                firstName:
                    cleanFirstName,

                lastName:
                    cleanLastName,

                password:
                    hashedPassword,

                role: safeRole,

                isBlock:
                    Boolean(isBlock),

                isEmailVerified:
                    Boolean(
                        isEmailVerified
                    ),

                profileImage: image,
            });

        return res.status(201).json({
            message:
                "User created successfully.",

            user:
                getPublicUser(user),
        });
    } catch (error) {
        console.error(
            "createUserAdmin error:",
            error
        );

        return res.status(500).json({
            message:
                "Something went wrong while creating the user.",
        });
    }
}

// ============================================================
// ADMIN - UPDATE USER
// PUT /api/users/admin/:id
// ============================================================

export async function updateUserAdmin(
    req,
    res
) {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({
                message:
                    "User ID is required.",
            });
        }

        const user =
            await User.findById(id);

        if (!user) {
            return res.status(404).json({
                message:
                    "User could not be found.",
            });
        }

        const {
            firstName,
            lastName,
            email,
            password,
            role,
            isBlock,
            isEmailVerified,
            profileImage,
        } = req.body;

        // ====================================================
        // FIRST NAME
        // ====================================================

        if (firstName !== undefined) {
            const value =
                String(firstName).trim();

            if (!value) {
                return res.status(400).json({
                    message:
                        "First name cannot be empty.",
                });
            }

            user.firstName = value;
        }

        // ====================================================
        // LAST NAME
        // ====================================================

        if (lastName !== undefined) {
            const value =
                String(lastName).trim();

            if (!value) {
                return res.status(400).json({
                    message:
                        "Last name cannot be empty.",
                });
            }

            user.lastName = value;
        }

        // ====================================================
        // EMAIL
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
        // PASSWORD
        // ====================================================

        if (
            password !== undefined &&
            String(password).trim()
        ) {
            const cleanPassword =
                String(password);

            if (cleanPassword.length < 6) {
                return res.status(400).json({
                    message:
                        "Password must contain at least 6 characters.",
                });
            }

            user.password =
                await bcrypt.hash(
                    cleanPassword,
                    10
                );
        }

        // ====================================================
        // ROLE
        // ====================================================

        if (role !== undefined) {
            if (
                role !== "user" &&
                role !== "admin"
            ) {
                return res.status(400).json({
                    message:
                        "Invalid user role.",
                });
            }

            // Prevent admin from accidentally
            // removing their own admin role.
            if (
                user._id.toString() ===
                    req.user.userID &&
                role !== "admin"
            ) {
                return res.status(400).json({
                    message:
                        "You cannot remove your own admin role.",
                });
            }

            user.role = role;
        }

        // ====================================================
        // BLOCK STATUS
        // ====================================================

        if (
            isBlock !== undefined
        ) {
            // Prevent admin from blocking themselves.
            if (
                user._id.toString() ===
                    req.user.userID &&
                Boolean(isBlock)
            ) {
                return res.status(400).json({
                    message:
                        "You cannot block your own account.",
                });
            }

            user.isBlock =
                Boolean(isBlock);
        }

        // ====================================================
        // EMAIL VERIFIED
        // ====================================================

        if (
            isEmailVerified !==
            undefined
        ) {
            user.isEmailVerified =
                Boolean(
                    isEmailVerified
                );
        }

        // ====================================================
        // PROFILE IMAGE
        // ====================================================

        if (
            profileImage !==
            undefined
        ) {
            if (
                profileImage === null ||
                String(
                    profileImage
                ).trim() === ""
            ) {
                user.profileImage =
                    DEFAULT_PROFILE_IMAGE;
            } else {
                const image =
                    String(
                        profileImage
                    ).trim();

                if (
                    !image.startsWith(
                        "http://"
                    ) &&
                    !image.startsWith(
                        "https://"
                    )
                ) {
                    return res.status(400).json({
                        message:
                            "Invalid profile image URL.",
                    });
                }

                user.profileImage =
                    image;
            }
        }

        await user.save();

        return res.status(200).json({
            message:
                "User updated successfully.",

            user:
                getPublicUser(user),
        });
    } catch (error) {
        console.error(
            "updateUserAdmin error:",
            error
        );

        return res.status(500).json({
            message:
                "Something went wrong while updating the user.",
        });
    }
}

// ============================================================
// ADMIN - DELETE USER
// DELETE /api/users/admin/:id
// ============================================================

export async function deleteUserAdmin(
    req,
    res
) {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({
                message:
                    "User ID is required.",
            });
        }

        if (
            id === req.user.userID
        ) {
            return res.status(400).json({
                message:
                    "You cannot delete your own admin account.",
            });
        }

        const user =
            await User.findById(id);

        if (!user) {
            return res.status(404).json({
                message:
                    "User could not be found.",
            });
        }

        await User.findByIdAndDelete(id);

        return res.status(200).json({
            message:
                "User deleted successfully.",
        });
    } catch (error) {
        console.error(
            "deleteUserAdmin error:",
            error
        );

        return res.status(500).json({
            message:
                "Something went wrong while deleting the user.",
        });
    }
}