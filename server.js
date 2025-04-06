const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const cors = require("cors");
const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const chatRoutes = require("./routes/chatRoutes");
const { addUser, removeUser, setTypingStatus } = require("./utils/socketUtils");
const Message = require("./models/Message");
const User = require("./models/User");
require("dotenv").config();

const app = express();
const server = http.createServer(app);
// const io = socketIo(server, { cors: { origin: "*" } });

const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"],
    credentials: true,
  },
});

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors());
app.use(express.json());
app.use("/api/v1", authRoutes);
app.use("/api/v1", chatRoutes);

const activeRooms = new Map();
const onlineUsers = new Set();

// Helper function to generate room ID
function getRoomId(senderId, receiverId) {
  // Sort the IDs to ensure room IDs are consistent
  const sortedIds = [senderId, receiverId].sort();
  const roomId = sortedIds.join("-");

  // If room doesn't exist in activeRooms, create and add it
  if (!activeRooms.has(roomId)) {
    activeRooms.set(roomId, roomId); // You can store the roomId as the value itself, or add more info if necessary
  }

  // Return the roomId (roomId is now guaranteed to exist)
  return activeRooms.get(roomId);
}

io.on("connection", (socket) => {
  // console.log("New client connected", socket.id);

  socket.on("join", ({ userId, otherUserId }) => {
    const roomId = getRoomId(userId, otherUserId);
    socket.join(roomId);
    console.log(`User ${(userId, otherUserId)} joined room ${roomId}`);
  });

  socket.on("sendMessage", async ({ senderId, receiverId, message, file }) => {
    console.log(
      senderId,
      receiverId,
      message,
      file,
      "senderId, receiverId, message, file"
    );
    try {
      const roomId = getRoomId(senderId, receiverId); // Generate roomId based on sender and receiver
      let fileUrl = null;
      if (file) {
        fileUrl = file;
      }

      const newMessage = new Message({
        senderId,
        receiverId,
        message,
        fileUrl,
        roomId, // Pass roomId when creating the message
      });

      await newMessage.save();
      console.log(`Message saved and sent to room ${roomId}`);

      // Broadcasting the message to the room
      io.to(roomId).emit("receiveMessage", newMessage);
      io.to(socket.id).emit("messageSent", newMessage);
    } catch (error) {
      console.log("Error in sendMessage:", error);
    }
  });

  // edit message

  socket.on(
    "editMessage",
    async ({ messageId, newMessage, userId, senderId }) => {
      const roomId = getRoomId(userId, senderId); // Generate roomId based on sender and receiver

      try {
        // Find the message by ID
        const message = await Message.findById(messageId);

        if (!message) {
          return io
            .to(socket.id)
            .emit("error", { message: "Message not found" });
        }

        // Ensure the user is the sender of the message
        if (message.senderId.toString() !== userId) {
          return io
            .to(socket.id)
            .emit("error", { message: "Unauthorized action" });
        }

        // Update the message content
        message.message = newMessage;
        await message.save();

        // Emit event to notify users about the edited message
        io.to(roomId).emit("messageEdited", { messageId, newMessage });

        console.log(`Message ${messageId} updated successfully`);
      } catch (error) {
        console.error("Error in editMessage:", error);
      }
    }
  );

  // delet message

  socket.on("deleteMessage", async ({ messageIds, userId, senderId }) => {
    try {
      console.log(userId, senderId, "userId, senderId");

      // Ensure messageIds is an array
      if (!Array.isArray(messageIds) || messageIds.length === 0) {
        return io
          .to(socket.id)
          .emit("error", { message: "No messages selected for deletion" });
      }

      const roomId = getRoomId(senderId, userId); // Get room ID

      // Find all messages by IDs
      const messages = await Message.find({ _id: { $in: messageIds } });

      if (!messages.length) {
        return io
          .to(socket.id)
          .emit("error", { message: "Messages not found" });
      }

      // Ensure the user is the sender of all messages before deleting
      const unauthorizedMessages = messages.filter(
        (msg) => msg.senderId.toString() !== userId
      );
      if (unauthorizedMessages.length) {
        return io
          .to(socket.id)
          .emit("error", { message: "Unauthorized action on some messages" });
      }

      // Delete all messages
      await Message.deleteMany({ _id: { $in: messageIds } });

      // Emit event to notify all users in the room about the deleted messages
      io.to(roomId).emit("messageDeleted", { messageIds });

      console.log(
        `Messages ${messageIds.join(", ")} deleted from room ${roomId}`
      );
    } catch (error) {
      console.error("Error in deleteMessage:", error);
    }
  });

  // -------------------------------pandding.........................
  socket.on(
    "replyMessage",
    async ({ senderId, receiverId, message, replyTo }) => {
      try {
        const roomId = getRoomId(senderId, receiverId);

        const replyMessage = new Message({
          senderId,
          receiverId,
          message,
          roomId,
          replyTo,
        });

        await replyMessage.save();

        io.to(roomId).emit("messageReplied", replyMessage);
      } catch (error) {
        console.error("Error in replyMessage:", error);
      }
    }
  );

  socket.on("getHistory", async ({ userId, otherUserId }) => {
    try {
      const messages = await Message.find({
        $or: [
          { senderId: userId, receiverId: otherUserId },
          { senderId: otherUserId, receiverId: userId },
        ],
      }).sort({ timestamp: 1 });

      io.to(socket.id).emit("chatHistory", messages);
    } catch (error) {
      console.log("Error in getHistory:", error);
    }
  });

  socket.on("typing", async ({ userId, otherUserId }) => {
    const roomId = getRoomId(userId, otherUserId); // Generate roomId based on sender and receiver

    try {
      io.to(roomId).emit("typingUser", userId);
    } catch (error) {
      console.log("Error in typing:", error);
    }
  });

  socket.on("userOnline", async ({ userId }) => {
    if (!userId) return;

    try {
      // Update user online status in the database
      await User.findByIdAndUpdate(userId, { onlineStatus: true });

      // Fetch the updated list of online users
      const onlineUsers = await User.find({ onlineStatus: true }).select("_id");
      io.emit(
        "onlineStatus",
        onlineUsers.map((user) => user._id)
      );
    } catch (error) {
      console.error("Error updating online status:", error);
    }
  });

  socket.on("userOffline", async ({ userId }) => {
    console.log(userId, "offline");
    if (!userId) return;

    try {
      // Update user online status and last seen time in the database
      await User.findByIdAndUpdate(userId, {
        onlineStatus: false,
        lastSeen: new Date(),
      });

      // Fetch the updated list of online users
      const onlineUsers = await User.find({ onlineStatus: true }).select("_id");
      io.emit(
        "onlineStatus",
        onlineUsers.map((user) => user._id)
      );
    } catch (error) {
      console.error("Error updating offline status:", error);
    }
  });

  socket.on("messageSeen", async ({ senderId, receiverId }) => {
    try {
      if (!senderId || !receiverId) return;

      // Find and update all unseen messages between sender and receiver
      await Message.updateMany(
        {
          $or: [
            { senderId, receiverId, seen: false },
            { senderId: receiverId, receiverId: senderId, seen: false },
          ],
        },
        { $set: { seen: true } }
      );

      // Emit to both users in the chat room that messages are seen
      io.to(senderId).emit("messageSeenSend", { senderId, receiverId });
      io.to(receiverId).emit("messageSeen", { senderId, receiverId });
    } catch (error) {
      console.error("Error in messageSeen:", error);
    }
  });

  // socket.on("sendFriendRes", async (data) => {
  //   const { receiverId, senderId } = data;
  //   try {
  //     const roomId = getRoomId(receiverId, senderId); // Generate roomId based on sender & receiver
  //     console.log(roomId, "testig....");
  //     // Update receiver's friend requests list
  //     await User.findByIdAndUpdate(receiverId, {
  //       $addToSet: { friendRequests: senderId }, // Prevent duplicate requests
  //     });

  //     io.to(roomId).emit("friend_request_received", receiverId);

  //     // io.to(roomId).emit("friend_request_received", receiverId);
  //     // io.to(roomId).emit("friend_request_received", senderId);

  //     // Send success response using the callback function
  //   } catch (error) {
  //     console.error("Error sending friend request:", error);
  //   }
  // });

  socket.on("sendFriendRes", async ({ receiverId, senderId }) => {
    try {
      console.log(`Friend request from ${senderId} to ${receiverId}`);

      const roomId = getRoomId(senderId,receiverId)
      // Update receiver's friend requests list
      await User.findByIdAndUpdate(receiverId, {
        $addToSet: { friendRequests: senderId }, // Prevent duplicate requests
      });

      io.emit("friend_request_received", senderId);
    } catch (error) {
      console.error("Error sending friend request:------------------------------", error);
    }
  });
  

  socket.on("disconnect", () => {
    console.log("user disconnected");
  });
});

// Global Error Handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: "Internal Server Error" });
});

module.exports = { io };

// Start Server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
