import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {

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
    },


    images: {
      type: [String],
      required: true,
      default: [],
    },


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


    quantity: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },


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
    },


    model: {
      type: String,
      trim: true,
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
    },


    scale: {
      type: String,
      default: "1:64",
    },


    seriesNumber: {
      type: String,
      trim: true,
    },


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