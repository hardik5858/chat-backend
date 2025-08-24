const mongoose = require("mongoose");
const Message = require("./models/message"); // adjust path to your schema

async function migrateOldMessages() {
  try {
    const result = await Message.updateMany(
      { 
        $or: [
          { isDelivered: { $exists: false } },
          { isRead: { $exists: false } }
        ]
      },
      { 
        $set: { 
          isDelivered: true,  // Assume old messages were delivered
          isRead: true        // Assume old messages were read
        } 
      }
    );

    console.log(`✅ Updated ${result.modifiedCount} old messages`);
  } catch (error) {
    console.error("Migration failed:", error);
  } finally {
    mongoose.connection.close();
  }
}

