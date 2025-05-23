const mongoose = require("mongoose");

const MessageSchema = new mongoose.Schema(
  {
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    roomId: {
      type: String,
      required: true,
    },
    group: { type: mongoose.Schema.Types.ObjectId, ref: "Group" }, // For group chat
    message: { type: String },
    seen: { type: Boolean, default: false },
    fileUrl:{type:String},
    createdTime: { type: Date, default: () => new Date() }, // Explicitly setting current date-time
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      default: null,
    }, 
  },
  { timestamps: true }
);

module.exports = mongoose.model("Message", MessageSchema);
