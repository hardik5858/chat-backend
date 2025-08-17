// packages
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const http = require("http");
const { Server } = require("socket.io");
// Top of server.js
const authRoutes = require("./routes/auth");
const protectedRoute = require("./routes/protectedRoute");
const messageRoute=require("./routes/messageRoute");
const userRoute = require("./routes/userRoutes");
const socketHandler=require("./socket/socket");
// const connectDB = require("./db");

// Load .env variables
dotenv.config();
console.log('🚀 Server is starting...');

// Create Express app and HTTP server
const app = express();
const server = http.createServer(app);

// Start the server
const PORT = process.env.PORT || 5000;
// server.listen(PORT,"0.0.0.0", () => {
//   console.log(`🚀 Server is running on http://localhost:${PORT}`);
// });

server.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});

// Middlewares
// app.use(cors());
app.use(cors({
  origin: ["http://localhost:3000", "https://your-frontend-url.onrender.com"],
  credentials: true
}));
app.use(express.json()); // ✅ FIXED this line

// MongoDB connection
const connectDB = async () => {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URL, {
            serverSelectionTimeoutMS: 5000 // Try setting this to a higher value like 10000
        });
        console.log(`Connected to MongoDB at ${mongoose.connection.host}`);
    } catch (error) {
        console.error('Database connection error:', error); // Log only the error message
    }
};
connectDB();


app.use("/api/user",authRoutes);
app.use("/api/protected", protectedRoute);
app.use("/api/message",messageRoute);
app.use("/api/users",userRoute)

// Routes
app.get("/", (req, res) => {
  res.send("🎉 Chat backend is working!");
});


// Socket setup
socketHandler(server);
