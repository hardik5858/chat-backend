const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const Message = require("../models/message");
const User = require("../models/user");
const admin = require('firebase-admin');

// Initialize Firebase Admin SDK (add this at the top)
// Make sure you have your service account key file
// const serviceAccount = require('../config/chat-notification-node-firebase-adminsdk-fbsvc-b947f26d37.json'); // Update path as needed
admin.initializeApp({
  credential: admin.credential.cert(
      {
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      }
    // serviceAccount
  )
});

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

 const userSocketMap = {}; // Maps userId to socketId
 const userFCMTokens = {}; // Maps userId to FCM token - ADD THIS

  io.on("connection", async(socket) => {
    const userId = socket.user.id;
  userSocketMap[userId] = socket.id;
  console.log(`✅ ${userId} -> ${socket.id}`);

    // User joins their private room
    socket.join(userId); // Join user's private room
    console.log(`✅ User ${userId} joined their private room`);

      // ADD: Handle FCM token registration
    socket.on("updateFCMToken", (data) => {
      const { fcmToken } = data;
      if (fcmToken) {
        userFCMTokens[userId] = fcmToken;
        console.log(`📱 FCM token updated for user ${userId}`);
        
        // Optional: Save to database for persistence
        // User.findByIdAndUpdate(userId, { fcmToken }).catch(console.error);
      }
    });

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

        // Check if receiver is online
        const isReceiverOnline = userSocketMap[receiverId];

         if (isReceiverOnline) {
          // Receiver is online - send via socket
          io.to(userSocketMap[receiverId]).emit("receiveMessage", populatedMsg);
          console.log(`📨 Delivered to online receiver (${receiverId})`);
        } else {
          // Receiver is offline - send push notification
          console.log(`📱 Receiver ${receiverId} is offline, sending push notification`);
          await sendPushNotification(receiverId, content, populatedMsg.sender.username);
        }
        
  //  // Send to receiver’s socket directly
  //   if (userSocketMap[receiverId]) {
  //     io.to(userSocketMap[receiverId]).emit("receiveMessage", populatedMsg);
  //   }
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
      // Remove user from online users map
      delete userSocketMap[userId];
    });
  });

   // ADD: Function to send push notifications
  async function sendPushNotification(receiverId, message, senderName) {
    try {
      const fcmToken = userFCMTokens[receiverId];
      
      if (!fcmToken) {
        console.log(`❌ No FCM token found for user ${receiverId}`);
        return;
      }

      const payload = {
        notification: {
          title: senderName || 'New Message',
          body: message.length > 100 ? message.substring(0, 97) + '...' : message,
          sound: 'default',
        },
        data: {
          senderId: receiverId.toString(),
          type: 'chat_message',
          click_action: 'FLUTTER_NOTIFICATION_CLICK',
        },
        android: {
          notification: {
            channelId: 'chat_messages',
            priority: 'high',
            defaultSound: true,
            icon: 'ic_launcher', // Make sure you have this icon
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
              alert: {
                title: senderName || 'New Message',
                body: message.length > 100 ? message.substring(0, 97) + '...' : message,
              },
            },
          },
        },
        token: fcmToken,
      };

      const response = await admin.messaging().send(payload);
      console.log('✅ Push notification sent successfully:', response);
      
    } catch (error) {
      console.error('❌ Error sending push notification:', error);
      
      // If token is invalid, remove it
      if (error.code === 'messaging/registration-token-not-registered' || 
          error.code === 'messaging/invalid-registration-token') {
        delete userFCMTokens[receiverId];
        console.log(`🗑️ Removed invalid FCM token for user ${receiverId}`);
      }
    }
  }
};
