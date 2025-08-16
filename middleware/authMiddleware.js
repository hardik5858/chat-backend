const jwt=require("jsonwebtoken");
const { model } = require("mongoose");

const verifyToken=(req,res,next)=>{
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({
            message:"No Token Provieded"
        });
    }

    const token=authHeader.split(" ")[1];
    try{
        const decode=jwt.verify(token,process.env.JWT_SECRET);
        req.user=decode;
        next();
    }catch(error){
        res.status(401).json({
            message:"Invalied or expired tiken"
        })
    }
    
}

module.exports=verifyToken;