import mongoose from "mongoose";

const userSchema = new mongoose.Schema({

    email : {
        type : String,
        required : true,
        unique : true
    },
    firstName : {
        type : String,
        required : true
    },
    lastName : {
        type : String,
        required : true
    },
    password : {
        type : String,
        required : true 
    },
    role : {
        type : String,
        required : true,
        default : "user"
    },
    isBlock : {
        type : Boolean,
        default : false
    },
    isEmailVerified : {
        type : Boolean,
        default : false
    },
    profileImage : {
        type : String,
        default : "https://training.allsoftsolutions.in/images/avtar.png"
    }
})

const User = mongoose.model("user",userSchema);

export default User;