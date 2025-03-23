const express = require("express");
const { register, login, verifyEmail, forgotPassword, resetPassword } = require("../controllers/authController");
const upload = require("../multer");
const { updateUser, getUserProfile, getAllUsers, getUserFriends } = require("../controllers/UserController");
const { authMiddleware } = require("../middleware/authMiddleware");
const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/verify-email", verifyEmail);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

// user
router.put("/update/:userId", upload, updateUser); 
router.get("/profile", authMiddleware, getUserProfile);
router.get("/getAllUser", authMiddleware, getAllUsers);
router.get("/getUserfriend", authMiddleware, getUserFriends);



module.exports = router;
