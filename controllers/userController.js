import User from "../models/user.js"
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"

export function createUser(req, res) {

    const hashedPassword = bcrypt.hashSync(req.body.password, 10)

    const user = new User(
        {
            email: req.body.email,
            firstName: req.body.firstName,
            lastName: req.body.lastName,
            password: hashedPassword,
            role: req.body.role
        }
    )

    user.save().then(
        () => {
            res.json("User saved successfully");
        }
    ).catch(
        (err) => {
            res.json("Error saving user: ", err);
        }
    )
}

export function loginUser(req, res) {

    User.findOne(
        {
            email: req.body.email
        }
    ).then(
        (user) => {

            if (user == null) {
                res.status(404).json({
                    message: "User not found",
                })

            } else {

                const isPasswordMatching = bcrypt.compareSync(req.body.password, user.password)
                if (isPasswordMatching) {

                    const toekn = jwt.sign(
                        {
                            email: user.email,
                            firstName: user.firstName,
                            lastName: user.lastName,
                            role: user.role,
                            isEmailVerified: user.isEmailVerified,
                        },
                        process.env.JWT_SECRET
                    )

                    res.json({
                        message: "Login successful",
                        token: toekn
                    })

                } else {
                    res.status(401).json({
                        message: "Invalid password"
                    })

                }
            }
        }
    )
}

export function isAdmin(req){

     if(req.user == null){
        return false;
    }

    if(req.user.role != "admin"){
        return false;
    }

    return true;
}