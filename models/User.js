const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, trim: true },
    password: { type: String, required: true },
    phone: { type: String }, // Allow phone to be null or undefined
    username: { type: String, unique: true, sparse: true }, // Ensure unique username
    image: { type: String },
    isVerified: { type: Boolean, default: false },
    bio: { type: String },
    otp: { type: String },
    otpExpires: { type: Date },

    onlineStatus: { type: Boolean, default: false },
    lastSeen: { type: Date, default: Date.now },

    rooms: [{ type: mongoose.Schema.Types.ObjectId, ref: "Room" }],

    friends: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // List of friends
    friendRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

    blockedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // Blocked users list

    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    groups: [{ type: mongoose.Schema.Types.ObjectId, ref: "Group" }], // List of group IDs the user is part of
  },
  { timestamps: true } // Auto add createdAt & updatedAt
);

UserSchema.methods.updateLastSeen = function () {
  this.lastSeen = Date.now();
  return this.save();
};

module.exports = mongoose.model("User", UserSchema);
