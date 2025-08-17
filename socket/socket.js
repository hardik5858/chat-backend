const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const Message = require("../models/message");
const User = require("../models/user");

module.exports = (server) => {
  const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  io.use((socket,next)=>{
    const token=socket.handshake.query.token;
    if(!token){
           console.log("❌ No token provided");
           return next(new Error("Authontication error"));
    }
    try{
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.user = decoded; // Attach user data to socket
         console.log("🔐 Authenticated user:", decoded.id);
         next();

    }catch(error){
        console.log("❌ Invalid token:", error.message);
        return next(new Error("Authontication failed"));
    }
  })  
const userSocketMap = {};
  io.on("connection", async(socket) => {
    const userId = socket.user.id;
  userSocketMap[userId] = socket.id;
  console.log(`✅ ${userId} -> ${socket.id}`);

    // User joins their private room
    socket.join(userId); // Join user's private room
    console.log(`✅ User ${userId} joined their private room`);

        // 🔁 Send ALL previous messages sent *to* the user
    try {
      const messages = await Message.find({ 
        // receiver: userId 
          $or: [
        { receiver: userId },  // Messages received by this user
        { sender: userId }     // Messages sent by this user
        ]
      })
        .sort({ createdAt: -1 })
        .populate("sender", "username email")
        .populate("receiver", "username email")
        .limit(100);

      socket.emit("initialMessages", messages);
      // io.to(receiverId).emit("receiveMessage", populatedMsg);
      // io.to(senderId).emit("receiveMessage", populatedMsg);
      console.log(`📦 Sent initial message history to user ${userId}`);
    } catch (error) {
      console.error("❌ Error fetching message history:", error.message);
    }

    // Handle sending message
    socket.on("sendMessage", async ({ receiverId, content }) => {
       console.log("🧪 Payload received =>", { receiverId, content });
           const senderId = socket.user.id;
      console.log(`📤 Message from ${senderId} to ${receiverId}: "${content}"`);

      try {
        const message = new Message({
          sender: senderId,
          receiver: receiverId,
          content,
        });

        const savedMessage = await message.save();

        // // Send to receiver's room
        // io.to(receiverId).emit("receiveMessage", savedMessage);
        // console.log(`📨 Delivered to receiver (${receiverId})`);

           const populatedMsg = await Message.findById(savedMessage._id)
        .populate("sender", "username email")
        .populate("receiver", "username email");
        
   // Send to receiver’s socket directly
    if (userSocketMap[receiverId]) {
      io.to(userSocketMap[receiverId]).emit("receiveMessage", populatedMsg);
    }
                // Send message to receiver
          // Send to receiver and echo to sender 
      io.to(receiverId).emit("receiveMessage", populatedMsg);
      io.to(senderId).emit("receiveMessage", populatedMsg);
      console.log(`📨 Delivered to receiver (${receiverId})`);

        // 3. Emit real-time chat preview update to receiver
        const senderUser = await User.findById(senderId).select("username email");

        io.to(receiverId).emit("chatListUpdate",{
          user: {
            _id: senderUser._id,
            name: senderUser.username,
            email: senderUser.email,
          },
          lastMessage: content,
          timestamp: savedMessage.timestamp,
        })

        // Optional: Echo back to sender to update sender UI
        // io.to(senderId).emit("receiveMessage", savedMessage);
        console.log(`🔁 Echoed back to sender (${senderId})`);
      } catch (error) {
        console.error("❌ Failed to send message:", error.message);
      }
    });

    // Handle disconnect
    socket.on("disconnect", () => {
      console.log("🔌 Client disconnected:", socket.id);
    });
  });
};
