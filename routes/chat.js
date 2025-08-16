const express = require("express");
const router = express.Router();
const Message = require("../models/message");
const User = require("../models/user");
const verifyToken = require("../middleware/authMiddleware");

router.get("/chats",verifyToken, async(req,res)=>{
    const userId=req.user.id;
    try{
        // Find all users who sent messages to this user
        const message=await Message.aggregate([
            { $match: {receiver : userId}},
            { $sort: {createdAt:-1}},
            {
                $group:{
                    _id:"$sender",// group by sender
                    lastMessage: { $first: "$content"},
                    timestamp:{ $first: "$createdAt"}
                }
            }
        ]);

        //get Sender user info (e.g name)
        const fullData=await Promise.all(
            message.map(async (msg)=>{
                const sender=await User.finedById(msg._id);
                return {
                    userId: msg._id,
                    name:sender?.name || "unknown",
                    lastMessage:msg.lastMessage,
                    timestamp:msg.timestamp 
                };
            })
        )

        res.json(fullData);

    }catch(error){
        console.log("❌ Error in /chats:",error.Message);
        res.status(500).json({
            error:"Server Error"
        });
    }
});

module.exports=router;