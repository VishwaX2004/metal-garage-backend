import Product from "../models/product.js";
import { isAdmin } from "./userController.js";

export async function createProduct(req, res) {

    if (!isAdmin(req)) {
        res.status(403).json(
            {
                message: "You are not authorize to create a product"
            }
        )
        return;
    }

    try {
        const productData = req.body;

        const product = new Product(productData);

        await product.save()

        res.json({
            message: "Product Created Successfully"
        })

    } catch (err) {

        res.status(500).json(
            {
                message: 'Failed to Create Product'
            }
        )

    }

}

export async function getProducts(req, res) {

    try {

        const products = await Product.find();

        res.json(products)


    } catch (err) {

        console.log(err);

        res.status(500).json(
            {
                message: "Failed to retrive product"
            }
        )

    }


}

export async function deleteProduct(req, res) {

    if (!isAdmin(req)) {
        res.status(403).json(
            {
                message: "You are not authorize to create a product"
            }
        )
        return;
    }

    try {

        const proudctID = req.params.productID

        await Product.deleteOne({
            productID: productID
        })

        res.json({
            message: "Product Deleted Successfully"
        })

    } catch (err) {

        res.status(500).json(
            {
                message: "Failed to Delete product"
            }
        )

    }

}

export async function updateProduct(req, res) {

    if (!isAdmin(req)) {
        res.status(403).json(
            {
                message: "You are not authorize to create a product"
            }
        )
        return;
    }

    try {

        const productID = req.params.productID
        const updateData = req.body

        await Product.updateOne({ productID: productID }, updateData)

        res.json({
            message: "Product Update Successfully"
        })

    } catch (err) {

        res.status(500).json(
            {
                message: "Failed to Update product"
            }
        )
    }

}

export async function getProductByID(req, res) {

    try {

        const productID = req.params.productID

        const product = await Product.findOne({ productID: productID })

        if (product == null) {

            res.status(404).json(
                {
                    message: "Product not fouund"
                }
            )
        }else{
            res.json(product)
        }

    } catch (err) {

          res.status(500).json(
            {
                message: "Failed to find product"
            }
        )

    }

}