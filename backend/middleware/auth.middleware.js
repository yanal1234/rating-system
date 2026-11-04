const jwt = require("jsonwebtoken");
require("dotenv/config");

const verifyToken = (req, res, next) => {
  try {
    const accessToken = req.cookies?.accesstoken;

    if (!accessToken) {
      return res.status(401).json({
        message: "Access token is required",
      });
    }

    const decoded = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET);

    req.user = decoded;

    next();
  } catch (error) {
    return res.status(401).json({
      message: "Invalid or expired token",
    });
  }
};

const verifyStaff = (req, res, next) => {
  if (!req.user || req.user.role !== "staff") {
    return res.status(403).json({
      message: "You do not have permission to perform this operation.",
    });
  }

  next();
};

module.exports = {
  verifyToken,
  verifyStaff,
};
