const mongoose = require("mongoose");

const messageSchema= new mongoose.Schema({
    sender:{
        type: mongoose.Schema.Types.ObjectId,
        ref:"User",
        required:true
    },
    receiver:{
        type :mongoose.Schema.Types.ObjectId,
        ref:"User",
        required:true
    },
    content:{
        type:String,
        required:true
    },
    // timestamp:{
    //     type:Date,
    //     default:Date.now
    // }
    isDelivered: { type: Boolean, default: false },
    isRead: { type: Boolean, default: false }
}, {
    timestamps: true, // ✅ adds createdAt and updatedAt automatically
  });


module.exports = mongoose.model("Message",messageSchema);