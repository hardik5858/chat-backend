const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/authMiddleware");
const User = require("../models/user");

// 🔍 Search users by name (excluding current user)
router.get("/search", verifyToken, async (req, res) => {
  const query = req.query.query;

  if (!query) {
    return res.status(400).json({ message: "Query is required" });
  }

  try {
    const users = await User.find({
      name: { $regex: query, $options: "i" },
      _id: { $ne: req.user.id }, // 👤 Exclude current user
    }).select("name email _id"); // Send limited fields only

    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: "Search failed", error: error.message });
  }
});

module.exports = router;
  