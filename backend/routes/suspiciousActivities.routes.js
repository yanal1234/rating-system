const express = require("express");
const router = express.Router();

const {
  getSuspiciousActivities,
  getSuspiciousActivityById,
  reviewSuspiciousActivity,
} = require("../controllers/suspiciousActivities.controller");

const { verifyToken, verifyStaff } = require("../middleware/auth.middleware");

router.use(verifyToken, verifyStaff);

router.get("/", getSuspiciousActivities);
router.get("/:id", getSuspiciousActivityById);
router.patch("/:id/review", reviewSuspiciousActivity);

module.exports = router;
