const express = require("express");
const router = express.Router();

const { getAllUsers, getUserById } = require("../controllers/users.controller");

const { verifyToken, verifyStaff } = require("../middleware/auth.middleware");

router.get("/", verifyToken, verifyStaff, getAllUsers);
router.get("/:id", verifyToken, verifyStaff, getUserById);

module.exports = router;
