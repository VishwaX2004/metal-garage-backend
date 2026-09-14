import mongoose from "mongoose";

// =============================================================
// PRODUCT SCHEMA
// =============================================================

const productSchema = new mongoose.Schema(
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
            default: [],
        },

        // =====================================================
        // CATEGORY
        // =====================================================

        category: {
            type: String,
            enum: [
                "Main Line",
                "Premium",
                "Silver Series",
                "Fantasy",
            ],
            required: true,
            default: "Main Line",
        },

        productType: {
            type: String,
            enum: [
                "Single Car",
                "Car Pack",
            ],
            required: true,
            default: "Single Car",
        },

        carCount: {
            type: Number,
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

        inStock: {
            type: Boolean,
            default: true,
        },

        // =====================================================
        // PRODUCT DETAILS
        // =====================================================

        year: {
            type: Number,
            default: new Date().getFullYear(),
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
            default: "",
            trim: true,
        },

        model: {
            type: String,
            default: "",
            trim: true,
        },

        vehicleType: {
            type: String,
            default: "Other",
            trim: true,
        },

        color: {
            type: String,
            default: "",
            trim: true,
        },

        scale: {
            type: String,
            default: "1:64",
            trim: true,
        },

        seriesNumber: {
            type: String,
            default: "",
            trim: true,
        },

        condition: {
            type: String,
            default: "New",
            trim: true,
        },

        packaging: {
            type: String,
            default: "Carded",
            trim: true,
        },

        // =====================================================
        // STATUS
        // =====================================================

        featured: {
            type: Boolean,
            default: false,
        },

        status: {
            type: String,
            enum: [
                "Active",
                "Out of Stock",
                "Inactive",
            ],
            default: "Active",
        },
    },
    {
        timestamps: true,
    }
);

// =============================================================
// SAVE MIDDLEWARE
// =============================================================
//
// Mongoose 9 compatible.
// IMPORTANT:
// Do NOT use function(next) and next() here.
// =============================================================

productSchema.pre("save", function () {
    const quantity = Number(this.quantity) || 0;

    if (quantity <= 0) {
        this.quantity = 0;
        this.inStock = false;
        this.status = "Out of Stock";
    } else {
        this.inStock = true;

        if (this.status === "Out of Stock") {
            this.status = "Active";
        }
    }
});

// =============================================================
// FIND ONE AND UPDATE MIDDLEWARE
// =============================================================
//
// Mongoose 9 compatible.
// No next().
// =============================================================

productSchema.pre("findOneAndUpdate", function () {
    const update = this.getUpdate();

    if (!update) {
        return;
    }

    let quantity;

    // ---------------------------------------------------------
    // Direct quantity update
    // ---------------------------------------------------------

    if (
        Object.prototype.hasOwnProperty.call(
            update,
            "quantity"
        )
    ) {
        quantity = Number(update.quantity);
    }

    // ---------------------------------------------------------
    // $set quantity update
    // ---------------------------------------------------------

    if (
        update.$set &&
        Object.prototype.hasOwnProperty.call(
            update.$set,
            "quantity"
        )
    ) {
        quantity = Number(update.$set.quantity);
    }

    // ---------------------------------------------------------
    // $inc quantity update
    //
    // IMPORTANT:
    // We cannot reliably calculate final quantity here without
    // reading the document, so don't automatically modify the
    // stock status for $inc operations.
    //
    // The order controller handles the final stock status.
    // ---------------------------------------------------------

    if (
        update.$inc &&
        Object.prototype.hasOwnProperty.call(
            update.$inc,
            "quantity"
        )
    ) {
        return;
    }

    // ---------------------------------------------------------
    // If quantity was explicitly updated
    // ---------------------------------------------------------

    if (quantity !== undefined) {
        if (quantity <= 0) {
            if (!update.$set) {
                update.$set = {};
            }

            update.$set.quantity = 0;
            update.$set.inStock = false;
            update.$set.status = "Out of Stock";
        } else {
            if (!update.$set) {
                update.$set = {};
            }

            update.$set.inStock = true;

            // Only reactivate products that were previously
            // marked as Out of Stock.
            if (
                update.$set.status === undefined
            ) {
                update.$set.status = "Active";
            }
        }
    }
});

// =============================================================
// INDEX
// =============================================================

productSchema.index({
    category: 1,
});

productSchema.index({
    status: 1,
});

productSchema.index({
    featured: 1,
});

// =============================================================
// MODEL
// =============================================================

const Product = mongoose.model(
    "Product",
    productSchema
);

export default Product;