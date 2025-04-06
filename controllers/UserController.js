const User = require("../models/User");
const cloudinary = require("../config/cloudinary"); // Import Cloudinary config
const multer = require("multer"); // Import Multer for image handling

// Update user profile (including image)
exports.updateUser = async (req, res) => {
  try {
    let uploadedImageUrl = req.body.image; // Default to existing image if no new image is uploaded

    // Check if a file is provided in the request
    if (req.file) {
      // If file is present, upload it to Cloudinary
      const result = await new Promise((resolve, reject) => {
        cloudinary.uploader
          .upload_stream(
            { folder: "user_images" }, // Optional: specify a folder in Cloudinary
            (error, result) => {
              if (error) reject(error); // Reject the promise in case of error
              else resolve(result); // Resolve with the result if successful
            }
          )
          .end(req.file.buffer); // Use the buffer from the uploaded file
      });

      uploadedImageUrl = result.secure_url; // Save the Cloudinary URL
    }

    const { username, email, phone, bio } = req.body;
    const { userId } = req.params;

    // Find the user by userId to fetch the current values
    const currentUser = await User.findById(userId);

    if (!currentUser) {
      return res.status(404).json({ message: "User not found" });
    }
    // Find and update the user profile
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        username: username || currentUser.username, // Use current username if not provided
        email: email || currentUser.email, // Use current email if not provided
        phone: phone || currentUser.phone, // Use current phone if not provided
        bio: bio || currentUser.bio, // Use current bio if not provided
        image: uploadedImageUrl || currentUser.image, // Use current image if not provided
      },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({
      message: "Profile updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};

// Get user profile by token
exports.getUserProfile = async (req, res) => {
  try {
    const userId = req.user; // This is the user ID from the decoded token

    // Find the user in the database by ID
    const user = await User.findById(userId).select("-password"); // Exclude password from response

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Return the user's profile data (you can customize what data to return)
    res.status(200).json({
      message: "User profile fetched successfully",
      user,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};

// Get all users (excluding password)
exports.getAllUsers = async (req, res) => {
  try {
    // Fetch all users from the database, excluding the password field
    const users = await User.find().select("-password");

    if (users.length === 0) {
      return res.status(404).json({ message: "No users found" });
    }

    // Return the list of users
    res.status(200).json({
      message: "Users fetched successfully",
      users,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};


// Get User friend Data


exports.getUserFriends = async (req, res) => {
  const userId = req.user; // Assuming userId is stored in req.user after JWT decoding

  try {
    // Find the user by their ID and only select the 'friends' field
    const user = await User.findById(userId).select("friends");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Fetch all friends but exclude sensitive fields
    const friendList = await User.find(
      { _id: { $in: user.friends } }, 
      "-password -email -phone -otp -otpExpires" // Exclude sensitive data
    );

    // Return only public friend details
    res.status(200).json({
      message: "User friends fetched successfully",
      friends: friendList,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};



