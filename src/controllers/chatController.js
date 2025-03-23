const Chat = require("../models/Chat");
const Message = require("../models/Message");
const User = require("../models/User");
const { io } = require("../server"); // Import the io instance from your server

// Get User Chats
// exports.getUserChats = async (req, res) => {
//   try {
//     const user1 = req.user; // Get the user1 ID from the request (authenticated user)
//     const user2 = req.params.userId; // Get user2 ID from the URL parameter

//     // Find messages where sender or receiver is one of the two users
//     const messages = await Message.find({
//       $or: [
//         { sender: user1, receiver: user2 }, // user1 sends to user2
//         { sender: user2, receiver: user1 }, // user2 sends to user1
//       ],
//     }).populate("sender receiver"); // Populate sender and receiver fields with user details

//     console.log(messages, "messages===");
//     if (messages.length === 0) {
//       return res
//         .status(404)
//         .json({ message: "No messages found between these users" });
//     }

//     res.status(200).json({
//       message: "Messages between users fetched successfully",
//       msg: messages,
//     });
//   } catch (error) {
//     res.status(500).json({ message: "Server Error", error: error.message });
//   }
// };

exports.getUserChats = async (req, res) => {
  try {
    const user1 = req.user; // Get the user1 ID from the request (authenticated user)
    const user2 = req.params.userId; // Get user2 ID from the URL parameter

    // Find messages where sender or receiver is one of the two users
    const messages = await Message.find({
      $or: [
        { sender: user1, receiver: user2 }, // user1 sends to user2
        { sender: user2, receiver: user1 }, // user2 sends to user1
      ],
    }).select("message timestamp sender receiver"); // Select only the message and related info fields

    if (messages.length === 0) {
      return res
        .status(404)
        .json({ message: "No messages found between these users" });
    }

    // Return only message data (excluding populated sender/receiver fields)
    const messagesData = messages.map((msg) => ({
      message: msg.message,
      timestamp: msg.timestamp,
      sender: msg.sender.toString(), // Convert ObjectId to string for clarity
      receiver: msg.receiver.toString(), // Convert ObjectId to string for clarity
    }));

    res.status(200).json({
      message: "Messages between users fetched successfully",
      msg: messagesData, // Only the message data
    });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// Send Message with Socket.io
exports.sendMessage = async (req, res) => {
  const { message, receiverId, senderId } = req.body; // Extract data from the request body

  try {
    // Create a new message in the database
    const newMessage = new Message({
      sender: senderId, // The sender of the message
      receiver: receiverId, // The receiver of the message
      message: message, // The actual message content
    });

    // Save the new message to the database
    await newMessage.save();

    // Emit the new message to all users in the chat room using Socket.io
    io.to(receiverId).emit("receive_group_message", {
      message: newMessage.message, // The message content
      sender: senderId, // Sender ID
      receiver: receiverId, // Receiver ID
      timestamp: newMessage.createdAt, // Timestamp of when the message was created
    });

    // Respond with the new message data in JSON format
    res.status(201).json({
      message: "Message sent successfully",
      data: newMessage, // The newly created message object
    });
  } catch (error) {
    console.error("Error sending message: ", error); // Log the error for debugging purposes
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// Create Group
exports.createGroup = async (req, res) => {
  const { name, users, isGroup, admin } = req.body;
  try {
    const room = new Chat({ name, users, isGroup, admin });
    await room.save();

    // Notify users of the new group
    users.forEach((userId) => {
      io.to(userId).emit("group_created", room);
    });

    res.status(201).json(room);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// Edit Group
exports.editGroup = async (req, res) => {
  const { name, users, admin } = req.body;
  const { roomId } = req.params;

  try {
    const room = await Chat.findById(roomId);
    if (!room) return res.status(404).json({ message: "Group not found" });

    if (name) room.name = name;
    if (users) room.users = users;
    if (admin) room.admin = admin;

    await room.save();

    // Notify all users in the group
    io.to(roomId).emit("group_updated", room);

    res.status(200).json({ message: "Group updated successfully", room });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Delete Group
exports.deleteGroup = async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.roomId);
    if (!chat) return res.status(404).json({ message: "Group not found" });

    await Chat.findByIdAndDelete(req.params.roomId);

    // Notify users in the group
    io.to(req.params.roomId).emit("group_deleted", {
      roomId: req.params.roomId,
    });

    res.status(200).json({ message: "Group deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Accept Friend Request
exports.acceptFriendRes = async (req, res) => {
  try {
    const { receiverId } = req.body;
    const userId = req.user;

    const user = await User.findById(userId);
    const friend = await User.findById(receiverId);

    if (!user || !friend)
      return res.status(404).json({ message: "User not found" });

    if (!user.friendRequests.includes(receiverId)) {
      return res.status(400).json({ message: "Friend request does not exist" });
    }

    await User.findByIdAndUpdate(userId, {
      $addToSet: { friends: receiverId },
      $pull: { friendRequests: receiverId },
    });

    await User.findByIdAndUpdate(receiverId, {
      $addToSet: { friends: userId },
    });

    // Notify users
    io.to(receiverId).emit("friend_request_accepted", { userId, friendId });

    res.status(200).json({ message: "Friend request accepted" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Send Friend Request
exports.sendFriendRes = async (req, res) => {
  try {
    const { receiverId } = req.body;
    const senderId = req.user;
    const receiver = await User.findById(receiverId);

    if (!receiver) return res.status(404).json({ message: "User not found" });

    if (
      receiver.friendRequests.includes(senderId) ||
      receiver.friends.includes(senderId)
    ) {
      return res
        .status(400)
        .json({ message: "Friend request already sent or already friends" });
    }

    await User.findByIdAndUpdate(receiverId, {
      $push: { friendRequests: senderId },
    });

    // Notify the receiver
    io.to(receiverId).emit("friend_request_received", { senderId });

    res.status(200).json({ message: "Friend request sent" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.sendBackFriendRequest = async (req, res) => {
  try {
    const { receiverId } = req.body; // The sender's ID (who previously sent the request)
    const friend = req.user; // The receiver's ID (current authenticated user)

    // Ensure the sender exists
    const sender = await User.findById(receiverId);
    if (!sender) return res.status(404).json({ message: "Sender not found" });

    // Ensure the receiver exists
    const receiver = await User.findById(friend);
    if (!receiver)
      return res.status(404).json({ message: "Receiver not found" });

    await User.findByIdAndUpdate(receiverId, {
      $pull: { friendRequests: friend },
    });

    // Notify the sender that the request has been removed
    io.to(sender).emit("friend_request_removed", { friend });

    // Send a response
    res.status(200).json({ message: "Friend request removed successfully" });
  } catch (error) {
    console.error("Error handling friend request removal: ", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Reject Friend Request
exports.rejectFriendRes = async (req, res) => {
  try {
    const { friendId } = req.body;
    const userId = res.user;
    const user = await User.findById(userId);

    if (!user || !user.friendRequests.includes(friendId)) {
      return res.status(400).json({ message: "No friend request found" });
    }

    await User.findByIdAndUpdate(userId, {
      $pull: { friendRequests: friendId },
    });

    res.status(200).json({ message: "Friend request rejected" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Remove Friend
exports.removeFriend = async (req, res) => {
  try {
    const { receiverId } = req.body; // receiverId from the request body
    const userId = req.user; // Use req.user to get the authenticated user's ID

    // Ensure both users exist in the database
    const user = await User.findById(userId);
    const receiver = await User.findById(receiverId);

    if (!user || !receiver) {
      return res.status(404).json({ message: "User not found" });
    }

    // Remove each other from friends list
    await User.findByIdAndUpdate(userId, { $pull: { friends: receiverId } });
    await User.findByIdAndUpdate(receiverId, { $pull: { friends: userId } });

    // Optionally notify the users via socket (uncomment to enable)
    // io.to(userId).emit("friend_removed", { receiverId });
    // io.to(receiverId).emit("friend_removed", { userId });

    res.status(200).json({ message: "Friend removed successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Block User
exports.blockUser = async (req, res) => {
  try {
    const { blockId } = req.body;
    const userId = res.user;

    await User.findByIdAndUpdate(userId, { $push: { blockedUsers: blockId } });

    // Notify the blocked user
    io.to(blockId).emit("user_blocked", { userId });

    res.status(200).json({ message: "User blocked successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Unblock User
exports.unblockUser = async (req, res) => {
  try {
    const { blockId } = req.body;
    const userId = res.user;

    await User.findByIdAndUpdate(userId, { $pull: { blockedUsers: blockId } });

    // Notify the unblocked user
    io.to(blockId).emit("user_unblocked", { userId });

    res.status(200).json({ message: "User unblocked successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
