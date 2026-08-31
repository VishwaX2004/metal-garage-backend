import express from 'express';
import { createProduct, deleteProduct, getProductByID, getProducts, updateProduct } from '../controllers/productController.js';

const productRouter = express.Router();

productRouter.get("/",getProducts) 

productRouter.post("/",createProduct)

productRouter.delete("/:id",deleteProduct)

productRouter.put("/:id",updateProduct)

productRouter.get("/:id",getProductByID)

export default productRouter;