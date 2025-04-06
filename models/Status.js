const mongoose = require("mongoose");

const StatusSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // User who posted status
    type: { type: String, enum: ["text", "image", "video"], required: true }, // Type of status
    content: { type: String, required: true }, // Text content or media URL
    viewedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // List of users who viewed
    expiresAt: { type: Date, default: () => new Date(Date.now() + 24 * 60 * 60 * 1000) }, // Auto delete after 24h
  },
  { timestamps: true }
);

module.exports = mongoose.model("Status", StatusSchema);
