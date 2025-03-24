// const express = require("express");
// const http = require("http");
// const socketIo = require("socket.io");
// const cors = require("cors");
// const connectDB = require("./config/db");
// const authRoutes = require("./routes/authRoutes");
// const chatRoutes = require("./routes/chatRoutes");
// const { addUser, removeUser, setTypingStatus } = require("./utils/socketUtils");
// const Message = require("./models/Message");
// require("dotenv").config();

// const app = express();
// const server = http.createServer(app);
// // const io = socketIo(server, { cors: { origin: "*" } });

// const io = socketIo(server, {
//   cors: {
//     origin: "http://localhost:3000",
//     methods: ["GET", "POST"],
//     allowedHeaders: ["Content-Type"],
//     credentials: true,
//   },
// });

// // Connect to MongoDB
// connectDB();

// // Middleware
// app.use(cors());
// app.use(express.json());
// app.use("/api/v1", authRoutes);
// app.use("/api/v1", chatRoutes);

// // io.on("connection", (socket) => {
// //   console.log("User connected:", socket.id);

// //   socket.on("join_room", (roomId) => {
// //     socket.join(roomId);
// //     console.log(`User joined room: ${roomId}`);
// //   });

// //   // send msg
// //   // Listen for sending a message
// //   socket.on("send_message", async ({ message, senderId, receiverId,roomId }) => {
// //     // Save message to the database
// //     try {
// //       const newMessage = new Message({
// //         sender: senderId,
// //         receiver: receiverId,
// //         message: message,
// //       });

// //       await newMessage.save();

// //       // Emit the new message to the receiver's room
// //       if (roomId) {
// //         io.to(roomId).emit("receive_message", {
// //           message: newMessage.message,
// //           sender: senderId,
// //           receiver: receiverId,
// //           timestamp: newMessage.createdAt,
// //         });
// //         console.log("Message sent to room:", receiverId);
// //       }
// //       socket.emit("message_status", { success: true, data: newMessage });

// //       // Respond to the client
// //     } catch (error) {
// //       console.error("Error saving message:", error);
// //       socket.emit("message_status", {
// //         success: false,
// //         message: "Error sending message",
// //       });
// //     }
// //   });

// //   socket.on("disconnect", () => {
// //     console.log("User disconnected");
// //   });
// // });

// // const io = socketIo(server, {
// //   cors: {
// //     origin: "http://localhost:3000",
// //     methods: ["GET", "POST"],
// //     allowedHeaders: ["Content-Type"],
// //     credentials: true,
// //   },
// // });

// const activeRooms = new Map();

// function getRoomId(senderId, receiverId) {
//   const sortedIds = [senderId, receiverId].sort();
//   const roomId = sortedIds.join("-");
//   if (!activeRooms.has(roomId)) {
//     activeRooms.set(roomId, uuidv4());
//   }
//   return activeRooms.get(roomId);
// }

// io.on("connection", (socket) => {
//   console.log("New client connected", socket.id);

//   socket.on("join", ({ userId, otherUserId }) => {
//     const roomId = getRoomId(userId, otherUserId);
//     socket.join(roomId);
//     console.log(`User ${userId} joined room ${roomId}`);
//   });

//   socket.on("sendMessage", async ({ senderId, receiverId, message, file }) => {
//     console.log("🚀  socket.on  file:", file);
//     try {
//       const roomId = getRoomId(senderId, receiverId);
//       let fileUrl = null;
//       if (file) {
//         fileUrl = file;
//       }
//       const newMessage = new Message({
//         senderId,
//         receiverId,
//         message,
//         fileUrl,
//         // roomId,
//       });
//       await newMessage.save();

//       console.log(`Sending message to room ${roomId}`);

//       io.to(roomId).emit("receiveMessage", newMessage);
//       io.to(socket.id).emit("messageSent", newMessage);
//     } catch (error) {
//       console.log("Error in sendMessage:", error);
//     }
//   });

//   socket.on("getHistory", async ({ userId, otherUserId }) => {
//     console.log("Getting history between:", userId, otherUserId);
//     try {
//       const messages = await Message.find({
//         $or: [
//           { senderId: userId, receiverId: otherUserId },
//           { senderId: otherUserId, receiverId: userId },
//         ],
//       }).sort({ timestamp: 1 });
//       console.log("🚀  socket.on  messages:", messages);

//       io.to(socket.id).emit("chatHistory", messages);
//     } catch (error) {
//       console.log("Error in getHistory:", error);
//     }
//   });

//   socket.on("disconnect", () => {
//     console.log("user disconnected");
//   });
// });

// // Global Error Handling
// app.use((err, req, res, next) => {
//   console.error(err.stack);
//   res.status(500).json({ message: "Internal Server Error" });
// });

// module.exports = { io };

// // Start Server
// const PORT = process.env.PORT || 5000;
// server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));



const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const cors = require("cors");
const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const chatRoutes = require("./routes/chatRoutes");
const { addUser, removeUser, setTypingStatus } = require("./utils/socketUtils");
const Message = require("./models/Message");
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
  console.log("New client connected", socket.id);

  socket.on("join", ({ userId, otherUserId }) => {
    const roomId = getRoomId(userId, otherUserId);
    socket.join(roomId);
    console.log(`User ${userId} joined room ${roomId}`);
  });

  socket.on("sendMessage", async ({ senderId, receiverId, message, file }) => {
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
