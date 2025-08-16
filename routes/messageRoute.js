const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/authMiddleware");
const Message = require("../models/message");


router.get("/getAllMessage",verifyToken,async (req,res)=>{
    try{
        const userId = req.user.id; 
        const message =await Message.find({receiver: userId})
        .sort({createdAt: -1}) 
        .populate("sender", "name email")  // Optional
        .populate("receiver", "name email");

        return res.json({ success: true, message: message });
    }catch(err){
        return res.status(500).json({ success: false, message: "Server error" });
    }
});

router.post("/",verifyToken, async(req,res)=>{
    const { receiver, content  }=req.body;

    if(!receiver || !content ){
        return res.status(400).json({
            message:"Receiver and content required"
        });
    }

    try{
        const message = new Message({
            sender: req.user.id,
            receiver,
            content
        });
        
        await message.save();
        res.status(201).json({
        message: "Message sent successfully",
        data: message
    });
    }catch(error){
        res.status(500).json({
            message:"Error handling message",
            error:error.message
        });
    }
});


router.get("/:userId",verifyToken,async(req,res)=>{
    const currectUserId=req.user.id;
    const otherUserId = req.params.userId;


    try{
        const message= await Message.find({
            $or:[
                {sender : currectUserId, receiver: otherUserId},
                {sender : otherUserId, receiver: currectUserId}
            ]
        }).sort({  createdAt: 1});
        res.status(200).json({
            message
        });
    }catch(error){
        res.status(500).json({
            message:"Failed to fatch message",
            error : error.message
        });
    }
});



module.exports = router;