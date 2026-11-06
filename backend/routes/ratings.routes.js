const express = require("express");
const router = express.Router();

const {
  createRating,
  getRatings,
  invalidateRating,
  updateRatingModeration,
  getMyRatingStats,
  getMyVoteProgress,
} = require("../controllers/ratings.controller");

const { verifyToken, verifyStaff } = require("../middleware/auth.middleware");

// Student routes
router.post("/", verifyToken, createRating);
router.get("/my-progress", verifyToken, getMyVoteProgress);
router.get("/my-stats/:window_id", verifyToken, getMyRatingStats);

// Staff routes
router.get("/window/:window_id", verifyToken, verifyStaff, getRatings);
router.patch("/:id/invalidate", verifyToken, verifyStaff, invalidateRating);
router.patch(
  "/:id/moderation",
  verifyToken,
  verifyStaff,
  updateRatingModeration,
);

module.exports = router;
