const User  =require("../models/user");
const bcrypt=require("bcryptjs");
const jwt = require("jsonwebtoken");

exports.register = async(req,res)=>{
    try{
        const{ username, email, password}=req.body;

        // Check if user already exists
        const userExists=await User.findOne({email});
        if(userExists){
            return res.status(400).josn({
                "message":"user is Alredy exists"
            });
        }

        //hash password 
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt); // ✅ correct

        const newUser=User({
            username,
            email,
            password:hashedPassword       
        })

        const saveUser=await newUser.save();

    res.status(200).json({
        message:"User registared",
        userId: saveUser._id
    });
    }catch(error){
        res.status(500).json({
            message:error.message
        })
    }
}

exports.login = async(req,res)=>{
    try{
        const {email,password} = req.body;
    
        const user=await User.findOne({
            email
        });
        if(!user){
            return res.status(404).json({
                message:"User not founed"
            });
        }

        const isMatch=await bcrypt.compare(password,user.password);
        if(!isMatch){
            return res.status(401).json({
                message:"Invalid Password"
            });
        }

        const token=jwt.sign(
            {id: user._id},
            process.env.JWT_SECRET,
            {expiresIn:"7d"}
        );

        res.status(200).json({
            message:"successfully login",
            token,
            user:{
                id:user._id,
                username:user.username,
                email:user.email
            }
        });

    }catch(error){
        res.status(500).json({
            message:error.message
        })
    }
}