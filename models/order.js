import mongoose from "mongoose";

// =============================================================
// ORDER ITEM SCHEMA
// =============================================================

const orderItemSchema = new mongoose.Schema(
    {
        productID: {
            type: String,
            required: true,
            trim: true,
        },

        name: {
            type: String,
            required: true,
            trim: true,
        },

        image: {
            type: String,
            default: "",
        },

        price: {
            type: Number,
            required: true,
            min: 0,
        },

        quantity: {
            type: Number,
            required: true,
            min: 1,
        },

        total: {
            type: Number,
            required: true,
            min: 0,
        },
    },
    {
        _id: false,
    }
);

// =============================================================
// SHIPPING ADDRESS SCHEMA
// =============================================================

const shippingAddressSchema =
    new mongoose.Schema(
        {
            fullName: {
                type: String,
                required: true,
                trim: true,
            },

            phone: {
                type: String,
                required: true,
                trim: true,
            },

            email: {
                type: String,
                required: true,
                trim: true,
                lowercase: true,
            },

            address: {
                type: String,
                required: true,
                trim: true,
            },

            city: {
                type: String,
                required: true,
                trim: true,
            },

            province: {
                type: String,
                required: true,
                trim: true,
            },

            postalCode: {
                type: String,
                default: "",
                trim: true,
            },

            notes: {
                type: String,
                default: "",
                trim: true,
            },
        },
        {
            _id: false,
        }
    );

// =============================================================
// ORDER SCHEMA
// =============================================================

const orderSchema = new mongoose.Schema(
    {
        orderID: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            index: true,
        },

        userID: {
            type: String,
            default: null,
            trim: true,
            index: true,
        },

        customerEmail: {
            type: String,
            required: true,
            trim: true,
            lowercase: true,
        },

        items: {
            type: [orderItemSchema],
            required: true,

            validate: {
                validator: function (items) {
                    return (
                        Array.isArray(items) &&
                        items.length > 0
                    );
                },

                message:
                    "Order must contain at least one product.",
            },
        },

        shippingAddress: {
            type: shippingAddressSchema,
            required: true,
        },

        subtotal: {
            type: Number,
            required: true,
            min: 0,
        },

        discount: {
            type: Number,
            default: 0,
            min: 0,
        },

        total: {
            type: Number,
            required: true,
            min: 0,
        },

        promoCode: {
            type: String,
            default: "",
            trim: true,
            uppercase: true,
        },

        paymentMethod: {
            type: String,
            enum: [
                "Cash on Delivery",
            ],
            default:
                "Cash on Delivery",
        },

        paymentStatus: {
            type: String,
            enum: [
                "Pending",
                "Paid",
                "Failed",
                "Refunded",
            ],
            default: "Pending",
        },

        orderStatus: {
            type: String,
            enum: [
                "Pending",
                "Confirmed",
                "Processing",
                "Shipped",
                "Delivered",
                "Cancelled",
            ],
            default: "Pending",
        },
    },

    {
        timestamps: true,
    }
);

// =============================================================
// MODEL
// =============================================================

const Order = mongoose.model(
    "Order",
    orderSchema
);

export default Order;