const User = require("../models/User");

const users = new Map(); // Store socket users

exports.addUser = (socketId, userId, io) => {
    users.set(socketId, userId);
    io.emit("update-online-status", { userId, online: true });
};

exports.removeUser = (socketId, io) => {
    const userId = users.get(socketId);
    users.delete(socketId);
    if (userId) {
        User.findByIdAndUpdate(userId, { onlineStatus: false, lastSeen: new Date() });
        io.emit("update-online-status", { userId, online: false });
    }
};

exports.setTypingStatus = (chatId, userId, isTyping, io) => {
    io.to(chatId).emit("typing-status", { userId, isTyping });
};
