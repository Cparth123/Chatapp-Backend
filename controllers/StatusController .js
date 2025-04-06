const Status = require("../models/Status");
const User = require("../models/User");
const { uploadFile } = require("../utils/upload"); // Utility function for file uploads

// UPLOAD STATUS (Text, Image, Video)
exports.uploadStatus = async (req, res) => {
  try {
    const { userId, type, text } = req.body;
    let content = "";

    if (type === "text") {
      content = text;
    } else if (req.file) {
      content = await uploadFile(req.file); // Upload image/video and get URL
    } else {
      return res.status(400).json({ message: "Invalid status type or file missing" });
    }

    const newStatus = new Status({
      user: userId,
      type,
      content,
    });

    await newStatus.save();

    // Emit event using Socket.io
    req.io.emit("status_update", newStatus);

    res.status(201).json({ message: "Status uploaded successfully", status: newStatus });
  } catch (error) {
    res.status(500).json({ message: "Error uploading status", error: error.message });
  }
};

// GET ALL STATUS
exports.getStatus = async (req, res) => {
  try {
    const statusList = await Status.find()
      .populate("user", "username image")
      .sort({ createdAt: -1 });

    res.status(200).json(statusList);
  } catch (error) {
    res.status(500).json({ message: "Error fetching status", error: error.message });
  }
};

// MARK STATUS AS VIEWED
exports.viewStatus = async (req, res) => {
  try {
    const { statusId, userId } = req.body;

    const status = await Status.findById(statusId);
    if (!status) return res.status(404).json({ message: "Status not found" });

    if (!status.viewedBy.includes(userId)) {
      status.viewedBy.push(userId);
      await status.save();
    }

    res.status(200).json({ message: "Status marked as viewed" });
  } catch (error) {
    res.status(500).json({ message: "Error marking status as viewed", error: error.message });
  }
};
