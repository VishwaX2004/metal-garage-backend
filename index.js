import express from 'express';
import mongoose from 'mongoose';
import Student from './models/student.js';
import studentRouter from './routes/studentsRouter.js';
import userRouter from './routes/userRouter.js';
import jwt from 'jsonwebtoken';
import productRouter from './routes/productRouter.js';

const app = express();

app.use(express.json());

app.use(
    (req, res, next) => {
        let token = req.header("authorization");

        if (token != null) {
            token = token.replace("Bearer ", "")
            jwt.verify(token, "jwt-secret", 
                (err,decoded) => {
                    if(decoded == null){
                        res.json({
                            message : "Invalid token please login again"
                        })
                        return;
                    }else{
                        req.user = decoded;
                    }
                }
            )
        }
        next();
    }
)

const connectionString = "mongodb+srv://admin:1234@cluster0.st6u0be.mongodb.net/?appName=Cluster0";

mongoose.connect(connectionString).then(
    () => {
        console.log("Connected to MongoDB");
    }
).catch(
    (err) => {
        console.log("Error connecting to MongoDB: ", err);
    }
)

app.use("/users", userRouter);
app.use("/products",productRouter);

app.listen(5000, () => {
    console.log('Server is running on port 5000');
});