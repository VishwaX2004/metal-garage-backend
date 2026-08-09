import express from 'express';
import mongoose from 'mongoose';
import userRouter from './routes/userRouter.js';
import jwt from 'jsonwebtoken';


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

const connectionString = "";

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

app.listen(5000, () => {
    console.log('Server is running on port 5000');
});