import express from "express";

import {
    createProduct,
    deleteProduct,
    getProductByID,
    getProducts,
    updateProduct,
} from "../controllers/productController.js";

const productRouter =
    express.Router();

// =========================================================
// GET ALL PRODUCTS
// GET /api/products
// =========================================================

productRouter.get(
    "/",
    getProducts
);

// =========================================================
// CREATE PRODUCT
// POST /api/products
// =========================================================

productRouter.post(
    "/",
    createProduct
);

// =========================================================
// GET PRODUCT BY PRODUCT ID
// GET /api/products/:productID
// =========================================================

productRouter.get(
    "/:productID",
    getProductByID
);

// =========================================================
// UPDATE PRODUCT
// PUT /api/products/:productID
// =========================================================

productRouter.put(
    "/:productID",
    updateProduct
);

// =========================================================
// DELETE PRODUCT
// DELETE /api/products/:productID
// =========================================================

productRouter.delete(
    "/:productID",
    deleteProduct
);

export default productRouter;

