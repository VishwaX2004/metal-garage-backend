import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    // Unique product identifier
    productID: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    // Product name
    name: {
      type: String,
      required: true,
      trim: true,
    },

    // Alternative names / search keywords
    altNames: {
      type: [String],
      default: [],
    },

    // Product description
    description: {
      type: String,
      required: true,
    },

    // Product images
    images: {
      type: [String],
      required: true,
      default: [],
    },

    // Product category
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

    // Single car or car pack
    productType: {
      type: String,
      required: true,
      enum: [
        "Single Car",
        "Car Pack",
      ],
    },

    // Number of cars included
    carCount: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
    },

    // Price
    price: {
      type: Number,
      required: true,
      min: 0,
    },

    // Original / marked price
    labelledPrice: {
      type: Number,
      required: true,
      min: 0,
    },

    // Available quantity
    quantity: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },

    // Hot Wheels release year
    year: {
      type: Number,
      required: true,
    },

    // Series name
    series: {
      type: String,
      required: true,
      trim: true,
    },

    // Car model / casting
    casting: {
      type: String,
      required: true,
      trim: true,
    },

    // Manufacturer of the real/fantasy vehicle
    manufacturer: {
      type: String,
      trim: true,
    },

    // Vehicle model
    model: {
      type: String,
      trim: true,
    },

    // Vehicle type
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

    // Main color
    color: {
      type: String,
      trim: true,
    },

    // Scale
    scale: {
      type: String,
      default: "1:64",
    },

    // Number of the car in a series
    seriesNumber: {
      type: String,
      trim: true,
    },

    // Packaging / condition
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

    // Packaging type
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

    // Whether product is currently available
    inStock: {
      type: Boolean,
      default: true,
    },

    // Featured product
    featured: {
      type: Boolean,
      default: false,
    },

    // Product status
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

// Automatically update stock status
productSchema.pre("save", function (next) {
  if (this.quantity <= 0) {
    this.inStock = false;
    this.status = "Out of Stock";
  } else {
    this.inStock = true;

    if (this.status === "Out of Stock") {
      this.status = "Active";
    }
  }

  next();
});

const Product = mongoose.model("Product", productSchema);

export default Product;