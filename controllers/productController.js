import Product from "../models/product.js";
import { isAdmin } from "./userController.js";


// =========================================================
// CREATE PRODUCT
// =========================================================

export async function createProduct(req, res) {
    if (!isAdmin(req)) {
        return res.status(403).json({
            message: "You are not authorized to create a product",
        });
    }

    try {
        const productData = req.body;

        if (
            !productData ||
            typeof productData !== "object"
        ) {
            return res.status(400).json({
                message: "Invalid product data",
            });
        }

        if (
            productData.images !== undefined &&
            !Array.isArray(productData.images)
        ) {
            productData.images = [
                productData.images,
            ];
        }

        const product = new Product(productData);

        await product.save();

        return res.status(201).json({
            message: "Product created successfully",
            product,
        });
    } catch (err) {
        console.error(
            "Error creating product:",
            err
        );

        if (err.code === 11000) {
            return res.status(409).json({
                message:
                    "Product ID or another unique field already exists.",
                error: err.message,
            });
        }

        if (err.name === "ValidationError") {
            return res.status(400).json({
                message:
                    "Product validation error",
                error: err.message,
            });
        }

        if (err.name === "CastError") {
            return res.status(400).json({
                message:
                    "Invalid product data",
                error: err.message,
            });
        }

        return res.status(500).json({
            message:
                "Error creating product",
            error: err.message,
        });
    }
}


// =========================================================
// GET ALL PRODUCTS
// =========================================================

export async function getProducts(req, res) {
    try {
        const products =
            await Product.find().sort({
                createdAt: -1,
            });

        return res.status(200).json(products);
    } catch (err) {
        console.error(
            "Error fetching products:",
            err
        );

        return res.status(500).json({
            message:
                "Error fetching products",
            error: err.message,
        });
    }
}


// =========================================================
// GET PRODUCT BY PRODUCT ID
// =========================================================

export async function getProductByID(req, res) {
    try {
        const { productID } =
            req.params;

        if (!productID) {
            return res.status(400).json({
                message:
                    "Product ID is required",
            });
        }

        const product =
            await Product.findOne({
                productID,
            });

        if (!product) {
            return res.status(404).json({
                message:
                    "Product not found",
            });
        }

        return res.status(200).json({
            product,
        });
    } catch (err) {
        console.error(
            "Error fetching product by ID:",
            err
        );

        return res.status(500).json({
            message:
                "Error fetching product by ID",
            error: err.message,
        });
    }
}


// =========================================================
// UPDATE PRODUCT
// =========================================================

export async function updateProduct(req, res) {
    if (!isAdmin(req)) {
        return res.status(403).json({
            message:
                "You are not authorized to update a product",
        });
    }

    try {
        const { productID } =
            req.params;

        const updateData = req.body;

        if (!productID) {
            return res.status(400).json({
                message:
                    "Product ID is required",
            });
        }

        if (
            !updateData ||
            typeof updateData !== "object"
        ) {
            return res.status(400).json({
                message:
                    "Invalid update data",
            });
        }

        if (
            updateData.images !== undefined &&
            !Array.isArray(updateData.images)
        ) {
            updateData.images = [
                updateData.images,
            ];
        }

        const product =
            await Product.findOneAndUpdate(
                { productID },
                updateData,
                {
                    returnDocument: "after",
                    runValidators: true,
                }
            );

        if (!product) {
            return res.status(404).json({
                message:
                    "Product not found",
            });
        }

        return res.status(200).json({
            message:
                "Product updated successfully",
            product,
        });
    } catch (err) {
        console.error(
            "Error updating product:",
            err
        );

        if (err.code === 11000) {
            return res.status(409).json({
                message:
                    "Product ID or another unique field already exists.",
                error: err.message,
            });
        }

        if (err.name === "ValidationError") {
            return res.status(400).json({
                message:
                    "Product validation failed.",
                error: err.message,
            });
        }

        if (err.name === "CastError") {
            return res.status(400).json({
                message:
                    "Invalid product data.",
                error: err.message,
            });
        }

        return res.status(500).json({
            message:
                "Error updating product",
            error: err.message,
        });
    }
}


// =========================================================
// DELETE PRODUCT
// =========================================================

export async function deleteProduct(req, res) {
    if (!isAdmin(req)) {
        return res.status(403).json({
            message:
                "You are not authorized to delete a product",
        });
    }

    try {
        const { productID } =
            req.params;

        if (!productID) {
            return res.status(400).json({
                message:
                    "Product ID is required",
            });
        }

        const result =
            await Product.deleteOne({
                productID,
            });

        if (result.deletedCount === 0) {
            return res.status(404).json({
                message:
                    "Product not found",
            });
        }

        return res.status(200).json({
            message:
                "Product deleted successfully",
        });
    } catch (err) {
        console.error(
            "Error deleting product:",
            err
        );

        return res.status(500).json({
            message:
                "Error deleting product",
            error: err.message,
        });
    }
}

