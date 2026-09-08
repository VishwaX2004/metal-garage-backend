import express from "express";

import {
    createProduct,
    deleteProduct,
    getProductByID,
    getProducts,
    updateProduct,
} from "../controllers/productController.js";

const productRouter = express.Router();

productRouter.get("/", getProducts);

productRouter.post("/", createProduct);

productRouter.get("/:productID", getProductByID);

productRouter.put("/:productID", updateProduct);

productRouter.delete("/:productID", deleteProduct);

export default productRouter;