import mongoose from "mongoose";

const productSchema =
    new mongoose.Schema(
        {
            // =====================================================
            // BASIC INFORMATION
            // =====================================================

            productID: {
                type: String,
                required: true,
                unique: true,
                trim: true,
            },

            name: {
                type: String,
                required: true,
                trim: true,
            },

            altNames: {
                type: [String],
                default: [],
            },

            description: {
                type: String,
                required: true,
                trim: true,
            },

            images: {
                type: [String],
                required: true,
                default: [],
            },

            // =====================================================
            // PRODUCT TYPE
            // =====================================================

            category: {
                type: String,
                required: true,
                enum: [
                    "Main Line",
                    "Premium",
                    "Silver Series",
                    "Fantasy",
                ],
            },

            productType: {
                type: String,
                required: true,
                enum: [
                    "Single Car",
                    "Car Pack",
                ],
            },

            carCount: {
                type: Number,
                required: true,
                min: 1,
                default: 1,
            },

            // =====================================================
            // PRICING
            // =====================================================

            price: {
                type: Number,
                required: true,
                min: 0,
            },

            labelledPrice: {
                type: Number,
                required: true,
                min: 0,
            },

            // =====================================================
            // INVENTORY
            // =====================================================

            quantity: {
                type: Number,
                required: true,
                min: 0,
                default: 0,
            },

            // =====================================================
            // MODEL INFORMATION
            // =====================================================

            year: {
                type: Number,
                required: true,
            },

            series: {
                type: String,
                required: true,
                trim: true,
            },

            casting: {
                type: String,
                required: true,
                trim: true,
            },

            manufacturer: {
                type: String,
                trim: true,
                default: "",
            },

            model: {
                type: String,
                trim: true,
                default: "",
            },

            vehicleType: {
                type: String,
                enum: [
                    "Sports Car",
                    "Supercar",
                    "Hypercar",
                    "Muscle Car",
                    "Classic Car",
                    "JDM",
                    "Truck",
                    "SUV",
                    "Race Car",
                    "Motorcycle",
                    "Fantasy",
                    "Other",
                ],
                default: "Other",
            },

            color: {
                type: String,
                trim: true,
                default: "",
            },

            scale: {
                type: String,
                trim: true,
                default: "1:64",
            },

            seriesNumber: {
                type: String,
                trim: true,
                default: "",
            },

            // =====================================================
            // CONDITION
            // =====================================================

            condition: {
                type: String,
                enum: [
                    "New",
                    "Mint",
                    "Near Mint",
                    "Used",
                ],
                default: "New",
            },

            packaging: {
                type: String,
                enum: [
                    "Carded",
                    "Blister Pack",
                    "Boxed",
                    "Multi Pack",
                ],
                default: "Carded",
            },

            // =====================================================
            // STATUS
            // =====================================================

            inStock: {
                type: Boolean,
                default: true,
            },

            featured: {
                type: Boolean,
                default: false,
            },

            status: {
                type: String,
                enum: [
                    "Active",
                    "Inactive",
                    "Out of Stock",
                    "Coming Soon",
                ],
                default: "Active",
            },
        },
        {
            timestamps: true,
        }
    );

// =============================================================
// SAVE STOCK SYNCHRONIZATION
// =============================================================

productSchema.pre(
    "save",
    function (next) {
        if (this.quantity <= 0) {
            this.inStock = false;
            this.status =
                "Out of Stock";
        } else {
            this.inStock = true;

            if (
                this.status ===
                "Out of Stock"
            ) {
                this.status =
                    "Active";
            }
        }

        next();
    }
);

// =============================================================
// UPDATE STOCK SYNCHRONIZATION
// =============================================================

productSchema.pre(
    "findOneAndUpdate",
    function (next) {
        const update =
            this.getUpdate();

        if (!update) {
            return next();
        }

        const updateData =
            update.$set || update;

        if (
            updateData.quantity !==
            undefined
        ) {
            const quantity =
                Number(
                    updateData.quantity
                );

            if (
                Number.isFinite(
                    quantity
                )
            ) {
                updateData.inStock =
                    quantity > 0;

                if (quantity <= 0) {
                    updateData.status =
                        "Out of Stock";
                } else if (
                    updateData.status ===
                    "Out of Stock"
                ) {
                    updateData.status =
                        "Active";
                }
            }
        }

        if (update.$set) {
            update.$set =
                updateData;
        } else {
            update.$set =
                updateData;

            for (const key of Object.keys(
                update
            )) {
                if (
                    key !== "$set" &&
                    !key.startsWith("$")
                ) {
                    delete update[key];
                }
            }
        }

        this.setUpdate(update);

        next();
    }
);

// =============================================================
// MODEL
// =============================================================

const Product =
    mongoose.model(
        "Product",
        productSchema
    );

export default Product;

