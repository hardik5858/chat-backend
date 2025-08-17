const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/authMiddleware");
const User = require("../models/user");

// 🔍 Search users by name (excluding current user)
router.get("/search", verifyToken, async (req, res) => {
  const {query,limit = 10} = req.query;

  if (!query) {
    return res.status(400).json({ message: "Query is required" });
  }

  try {
     // Sanitize the query to prevent regex injection
    const sanitizedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // Search users with pagination 
    const users = await User.find({
      $or:[
        {username: { $regex: sanitizedQuery, $options: "i" }},
        {email : {$regex: sanitizedQuery, $options: "i"}}
      ]
    })
    .select("username email _id")
    .limit(parseInt(limit)) // Convert to number and limit results
    .lean(); // Convert to plain JS objects for better performance; // Send limited fields only

    res.status(200).json({
      success:true,
      count:users.length,
      data:users
    });
  } catch (error) {
      console.error("Search error:", error);
    res.status(500).json({ 
       success: false,
       message: "Search failed due to server error",
       error: error.message 
      });
  }
});

module.exports = router;
  