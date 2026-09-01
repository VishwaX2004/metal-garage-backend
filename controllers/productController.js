import Product from "../models/product.js";
import { isAdmin } from "./userController.js";

export async function createProduct(req, res) {

    if (!isAdmin(req)) {
        res.status(403).json({
            message: "You are not authorized to create a product"
        })
        return;
    }

    try {

        const productData = req.body;

        const product = new Product(productData);

        await product.save();

        return res.status(201).json({
            message: "Product created successfully",
            product: product
        })


    } catch (err) {

        res.status(500).json({
            message: "Error creating product",
            error: err.message
        })

        if (err.code === 11000) {

            return res.status(409).json({
                message: "Product with this name already exists"
            })
        }

        if (err.name === "ValidationError") {

            return res.status(400).json({
                message: "Validation error",
                error: err.message
            })
        }

        return res.status(500).json({
            message: "Internal server error",
            error: err.message
        })

    }

}

export async function getProducts(req, res) {

    try {

        const products = await Product.find().sort({ createdAt: -1 });

        return res.status(200).json(
            products
        )

    } catch (err) {

        console.error("Error fetching products: ", err);

        return res.status(500).json({
            message: "Error fetching products",
            error: err.message
        })
    }
}

export async function deleteProduct(req, res) {

    if (!isAdmin(req)) {
        res.status(403).json({
            message: "You are not authorized to delete a product"
        })
        return;
    }

    try {

        const productID = req.params.productID;

        if (!productID) {
            return res.status(400).json({
                message: "Product ID is required"
            })
        }

        const result = await Product.deleteOne({
            productID: productID
        })

        if (result.deletedCount === 0) {
            return res.status(404).json({
                message: "Product not found"
            })
        }

        return res.status(200).json({
            message: "Product deleted successfully"
        })

    } catch (err) {

        console.error("Error deleting product: ", err);

        return res.status(500).json({
            message: "Error deleting product",
            error: err.message
        })

    }

}


export async function updateProduct(req, res) {

    if (!isAdmin(req)) {
        res.status(403).json({
            message: "You are not authorized to update a product"
        })
        return;
    }

    try {

        const productID = req.params.productID;

        const updateData = req.body;

        if (!productID) {
            return res.status(400).json({
                message: "Product ID is required"
            })
        }

        const product = await Product.findOneAndUpdate(
            {
                productID: productID
            },
            updateData,
            {
                new: true,
                runValidators: true
            }
        )

        if (!product) {
            return res.status(404).json({
                message: "Product not found"
            })
        }

        res.status(200).json({
            message: "Product updated successfully",
            product: product
        })

    } catch (err) {

        console.error("Error updating product: ", err);

        if (err.code === 11000) {

            return res.status(409).json({
                message:
                    "Product ID or SKU already exists.",
                error: err.message
            });
        }

        if (err.name === "ValidationError") {

            return res.status(400).json({
                message:
                    "Product validation failed.",
                error: err.message
            });
        }

        return res.status(500).json({
            message: "Error updating product",
            error: err.message
        })

    }

}

export async function getProductByID(req, res) {

    try{

        const productID = req.params.productID;

        const product = await Product.findOne({
            productID: productID
        })

        if (!product) {
            return res.status(404).json({
                message: "Product not found"
            })
        }

        return res.status(200).json({
            product: product
        })

    }catch(err){

        console.error("Error fetching product by ID: ", err);

        return res.status(500).json({
            message: "Error fetching product by ID",
            error: err.message
        })
    }
}