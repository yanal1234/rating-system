const express = require("express");
const router = express.Router();

const {
  login,
  logout,
  refreshToken,
  getMe,
} = require("../controllers/auth.controller");

const { verifyToken } = require("../middleware/auth.middleware");

router.post("/login", login);
router.post("/logout", logout);
router.post("/refresh", refreshToken);
router.get("/me", verifyToken, getMe);

module.exports = router;
