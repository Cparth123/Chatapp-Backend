const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const cors = require("cors");
const connectDB = require("./config/db");
const authRoutes = require("./src/routes/authRoutes");
const chatRoutes = require("./src/routes/chatRoutes");
const { addUser, removeUser, setTypingStatus } = require("./utils/socketUtils");
const Message = require("./models/Message");
require("dotenv").config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: "*" } });

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors());
app.use(express.json());
app.use("/api/v1", authRoutes);
app.use("/api/v1", chatRoutes);

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("join_room", (roomId) => {
    socket.join(roomId);
    console.log(`User joined room: ${roomId}`);
  });

  // send msg
  // Listen for sending a message
  socket.on("send_message", async ({ message, senderId, receiverId,roomId }) => {
    // Save message to the database
    try {
      const newMessage = new Message({
        sender: senderId,
        receiver: receiverId,
        message: message,
      });

      await newMessage.save();

      // Emit the new message to the receiver's room
      if (roomId) {
        io.to(roomId).emit("receive_message", {
          message: newMessage.message,
          sender: senderId,
          receiver: receiverId,
          timestamp: newMessage.createdAt,
        });
        console.log("Message sent to room:", receiverId);
      }
      socket.emit("message_status", { success: true, data: newMessage });

      // Respond to the client
    } catch (error) {
      console.error("Error saving message:", error);
      socket.emit("message_status", {
        success: false,
        message: "Error sending message",
      });
    }
  });

  socket.on("disconnect", () => {
    console.log("User disconnected");
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
