const express = require("express");
const router = express.Router();

const {
  getAllUsers,
  getUserById,
  updateMyProfile,
} = require("../controllers/users.controller");

const { verifyToken, verifyStaff } = require("../middleware/auth.middleware");

// Current user's profile
router.patch("/me/profile", verifyToken, updateMyProfile);

// Staff routes
router.get("/", verifyToken, verifyStaff, getAllUsers);
router.get("/:id", verifyToken, verifyStaff, getUserById);

module.exports = router;
