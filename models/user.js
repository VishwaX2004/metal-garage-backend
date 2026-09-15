import mongoose from "mongoose";

const DEFAULT_PROFILE_IMAGE =
    "https://training.allsoftsolutions.in/images/avtar.png";

const userSchema = new mongoose.Schema(
    {
        email: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            lowercase: true,
        },

        firstName: {
            type: String,
            required: true,
            trim: true,
        },

        lastName: {
            type: String,
            required: true,
            trim: true,
        },

        password: {
            type: String,
            required: true,
        },

        role: {
            type: String,
            required: true,
            default: "user",
            enum: [
                "user",
                "admin",
            ],
        },

        isBlock: {
            type: Boolean,
            default: false,
        },

        isEmailVerified: {
            type: Boolean,
            default: false,
        },

        profileImage: {
            type: String,
            default:
                DEFAULT_PROFILE_IMAGE,
        },
    },

    {
        timestamps: true,
    }
);

const User = mongoose.model(
    "user",
    userSchema
);

export default User;