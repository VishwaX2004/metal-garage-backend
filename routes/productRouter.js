import express from 'express';
import { createProduct, deleteProduct, getProductByID, getProducts, updateProduct } from '../controllers/productController.js';

const productRouter = express.Router()

productRouter.get("/", getProducts);

productRouter.post("/", createProduct);

productRouter.delete("/:productID", deleteProduct);

productRouter.put("/:productID", updateProduct);

productRouter.get("/:productID",getProductByID);

export default productRouter;