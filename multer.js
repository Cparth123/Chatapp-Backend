const multer = require('multer');

// Multer setup for handling image uploads
const storage = multer.memoryStorage(); // Store image in memory (before uploading to Cloudinary)
const upload = multer({ storage: storage }).single('image'); // Expect 'image' field in the form data

module.exports = upload;
