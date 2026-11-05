const express = require("express");
const router = express.Router();

const {
  getAnalytics,
  getWindowAnalyticsById,
} = require("../controllers/analytics.controller");

const { verifyToken, verifyStaff } = require("../middleware/auth.middleware");

router.get("/", verifyToken, verifyStaff, getAnalytics);

router.get(
  "/window/:window_id",
  verifyToken,
  verifyStaff,
  getWindowAnalyticsById,
);

module.exports = router;
