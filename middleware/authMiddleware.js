const jwt = require("jsonwebtoken");

exports.authMiddleware = (req, res, next) => {
    // Extract token from Authorization header
    const token = req.header("Authorization");

    // If no token is provided
    if (!token) {
        return res.status(401).json({ message: "Access Denied. No token provided." });
    }

    try {
        // Check for 'Bearer ' prefix and strip it
        const formattedToken = token.startsWith("Bearer ") ? token.replace("Bearer ", "") : token;
        
        // Verify token and extract user data
        const verified = jwt.verify(formattedToken, process.env.JWT_SECRET);

        // Attach the verified user data (or just user id) to the request object
        req.user = verified.id || verified; // Depending on the structure of your payload (use `verified.id` if available)

        // Proceed to the next middleware or route
        next();
    } catch (error) {
        // Optional: Log the error for debugging purposes
        console.error("Token verification failed:", error);

        // Send error response
        res.status(400).json({ message: "Invalid or expired token" });
    }
};
