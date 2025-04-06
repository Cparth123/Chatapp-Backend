const express = require("express");
const {
  getUserChats,
  sendMessage,
  createGroup,
  deleteGroup,
  sendFriendRes,
  acceptFriendRes,
  rejectFriendRes,
  blockUser,
  unblockUser,
  removeFriend,
  editGroup,
  sendBackFriendRequest,
  getGroupChat,
} = require("../controllers/chatController");
const { authMiddleware } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/getchats/:userId", authMiddleware, getUserChats);
router.post("/send-message", authMiddleware, sendMessage);

// Group
router.get("/get-room-groupId", getGroupChat);
router.post("/create-room", authMiddleware, createGroup);
router.post("/edit-room/:roomId", authMiddleware, editGroup);
router.post("/delete-room/:roomId", authMiddleware, deleteGroup);

// Friend

router.post("/send-friend-request", authMiddleware, sendFriendRes);
router.post("/send-back-friend-request", authMiddleware, sendBackFriendRequest);

router.post("/accept-friend-request", authMiddleware, acceptFriendRes);
router.post("/reject-friend-request", authMiddleware, rejectFriendRes);
router.post("/remove-friend", authMiddleware, removeFriend);


// block-user

router.post("/block-user", authMiddleware, blockUser);
router.post("/unblock-user", authMiddleware, unblockUser);

module.exports = router;
