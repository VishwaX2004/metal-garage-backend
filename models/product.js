import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
    {
        productID : {
            type : String,
            unique : true,
            required : true
        },
        name : {
            type : String,
            required : true
        },
        altNames :{
            type : [String],
            default : [],
            required : true
        },
        description : {
            type : String,
            required : true
        },
        image : {
            type : [String],
            default : [],
            required : true
        },
        price : {
            type : Number,
            required : true
        },
        lablledPrice : {
            type : Number,
            required : true
        },
        category : {
            type : String,
            required : true
        }
    }
)

const Product = mongoose.model("product",productSchema);

export default Product;